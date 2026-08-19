"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Loader2,
  ExternalLink,
  ClipboardPaste,
  Building,
  Trees,
  Cross,
  GraduationCap,
  Bus,
} from "lucide-react";
import barrioCoordsData from "@/data/coords_by_barrio.json";

interface BarrioInfo {
  name: string;
  lat: number;
  lng: number;
  comuna: string;
  zone?: string;
}

interface PlaceResult {
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  type?: string;
}

interface MapLocationPickerProps {
  initialBarrio?: string;
  initialLat?: number;
  initialLng?: number;
  onSelectLocation: (location: { neighborhood: string; lat: number; lng: number }) => void;
  onClose: () => void;
}

const barriosList = Object.values(barrioCoordsData) as BarrioInfo[];

// Helper to find closest barrio name from lat/lng
function getClosestBarrio(lat: number, lng: number): string {
  let minDistance = Infinity;
  let closest = "Cali Centro";

  for (const b of barriosList) {
    const dLat = b.lat - lat;
    const dLng = b.lng - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDistance) {
      minDistance = dist;
      closest = b.name;
    }
  }

  return closest;
}

// Parse coordinates or Google Maps URLs
function extractCoordsFromText(text: string): { lat: number; lng: number } | null {
  const trimmed = text.trim();

  // Pattern 1: Direct coordinates like "3.4516, -76.5320" or "3.4516 -76.5320"
  const coordsRegex = /^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/;
  const coordsMatch = trimmed.match(coordsRegex);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 2: Google Maps URL with @lat,lng or ?q=lat,lng
  // e.g. https://www.google.com/maps/@3.4358,-76.5469,15z
  // e.g. https://www.google.com/maps/place/.../@3.4358,-76.5469
  // e.g. https://www.google.com/maps?q=3.4358,-76.5469
  const gmapsAtRegex = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
  const gmapsAtMatch = trimmed.match(gmapsAtRegex);
  if (gmapsAtMatch) {
    return { lat: parseFloat(gmapsAtMatch[1]), lng: parseFloat(gmapsAtMatch[2]) };
  }

  const gmapsQRegex = /[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
  const gmapsQMatch = trimmed.match(gmapsQRegex);
  if (gmapsQMatch) {
    return { lat: parseFloat(gmapsQMatch[1]), lng: parseFloat(gmapsQMatch[2]) };
  }

  return null;
}

function getPlaceIcon(type?: string) {
  switch (type) {
    case "mall":
      return <Building className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />;
    case "park":
    case "plaza":
      return <Trees className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
    case "hospital":
      return <Cross className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />;
    case "university":
      return <GraduationCap className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />;
    case "transport":
      return <Bus className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />;
    default:
      return <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />;
  }
}

export default function MapLocationPicker({
  initialBarrio,
  initialLat,
  initialLng,
  onSelectLocation,
  onClose,
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [selectedLat, setSelectedLat] = useState<number>(initialLat || 3.4516);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || -76.532);
  const [selectedBarrio, setSelectedBarrio] = useState<string>(
    initialBarrio || getClosestBarrio(initialLat || 3.4516, initialLng || -76.532)
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedLink, setPastedLink] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      const L = (await import("leaflet")).default;

      const customIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!mapInstanceRef.current && isMounted && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current).setView(
          [selectedLat, selectedLng],
          15
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([selectedLat, selectedLng], {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on("dragend", (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          setSelectedLat(lat);
          setSelectedLng(lng);
          const nearest = getClosestBarrio(lat, lng);
          setSelectedBarrio(nearest);
        });

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedLat(lat);
          setSelectedLng(lng);
          const nearest = getClosestBarrio(lat, lng);
          setSelectedBarrio(nearest);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Live place & landmark search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.warn("Geocoding query error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select place from live autocomplete
  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedLat(place.lat);
    setSelectedLng(place.lng);
    const nearestBarrio = getClosestBarrio(place.lat, place.lng);
    setSelectedBarrio(nearestBarrio);
    setSearchQuery(place.name);
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([place.lat, place.lng], 16);
      markerRef.current.setLatLng([place.lat, place.lng]);
    }
  };

  // Paste Google Maps link or coordinates
  const handleProcessPastedLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasteError(null);

    const coords = extractCoordsFromText(pastedLink);
    if (coords) {
      setSelectedLat(coords.lat);
      setSelectedLng(coords.lng);
      const nearest = getClosestBarrio(coords.lat, coords.lng);
      setSelectedBarrio(nearest);
      setShowPasteModal(false);
      setPastedLink("");

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
        markerRef.current.setLatLng([coords.lat, coords.lng]);
      }
    } else {
      setPasteError(
        "No pudimos detectar coordenadas en el texto o enlace. Asegúrate de copiar el enlace completo de Google Maps o escribir coordenadas tipo: 3.4516, -76.5320"
      );
    }
  };

  // GPS Locate User
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización");
      return;
    }

    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingGPS(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setSelectedLat(lat);
        setSelectedLng(lng);
        const nearest = getClosestBarrio(lat, lng);
        setSelectedBarrio(nearest);
        setSearchQuery("");
        setSearchResults([]);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        setGettingGPS(false);
        alert("No se pudo obtener la señal GPS. Puedes buscar el lugar en la barra o tocar el mapa.");
        console.warn("GPS error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    onSelectLocation({
      neighborhood: selectedBarrio,
      lat: selectedLat,
      lng: selectedLng,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/75 z-[70] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col h-[92vh] sm:h-[84vh] text-stone-900 shadow-2xl relative">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 shadow-2xs">
              <MapPin className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">
                Ubicación de la Mascota
              </h3>
              <p className="text-xs text-stone-600">
                Busca lugares conocidos (parques, centros comerciales, avenidas) o pega un enlace de Google Maps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Search Bar & Google Maps Actions */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2 relative z-[2000]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca como en Google Maps (Ej: Parque del Perro, Chipichape, Univalle, Calle 5...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              {searching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 absolute right-3 top-3" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Paste Google Maps Link Button */}
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="bg-white hover:bg-amber-50 text-stone-800 border border-stone-200 hover:border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap cursor-pointer"
              title="Pegar enlace o coordenadas de Google Maps"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Pegar Google Maps</span>
            </button>

            {/* GPS Locate Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingGPS}
              className="bg-white hover:bg-amber-50 text-amber-800 border border-stone-200 hover:border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap cursor-pointer"
              title="Obtener ubicación GPS actual"
            >
              {gettingGPS ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">Mi GPS</span>
            </button>
          </div>

          {/* Autocomplete Dropdown - Works like Google Maps Search */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-14 bg-white border border-stone-200 rounded-2xl shadow-2xl z-[3000] max-h-60 overflow-y-auto divide-y divide-stone-100 animate-fade-in">
              <div className="p-2 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Lugares y Sitios Encontrados:
              </div>
              {searchResults.map((place, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 flex items-center justify-between text-xs transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-amber-100 transition">
                      {getPlaceIcon(place.type)}
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block text-xs">{place.name}</span>
                      <span className="text-[10.5px] text-stone-500 block truncate max-w-sm">
                        {place.display_name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 font-semibold flex-shrink-0 ml-2">
                    Ver en mapa ↗
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 w-full relative z-[10]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />

          {/* Floating Current Location Pill */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl p-3 z-[1500] flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-stone-500 block text-[10px] uppercase font-bold">Barrio / Punto:</span>
                <strong className="text-stone-900 font-extrabold text-sm">{selectedBarrio}</strong>
              </div>
            </div>

            {/* Direct Google Maps Link */}
            <a
              href={`https://www.google.com/maps?q=${selectedLat},${selectedLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg transition"
              title="Abrir punto en Google Maps"
            >
              <span>Abrir Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500 hidden sm:block">
            📍 GPS: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Este Punto</span>
            </button>
          </div>
        </div>

        {/* Modal: Pegar enlace o coordenadas de Google Maps */}
        {showPasteModal && (
          <div className="absolute inset-0 bg-stone-900/60 z-[4000] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
            <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-amber-600" />
                  <h4 className="font-extrabold text-sm text-stone-900">
                    Pegar Ubicación de Google Maps
                  </h4>
                </div>
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Copia el enlace de compartir o las coordenadas desde Google Maps y pégalo aquí para ubicar el punto al instante:
              </p>

              <form onSubmit={handleProcessPastedLocation} className="space-y-3">
                <textarea
                  value={pastedLink}
                  onChange={(e) => setPastedLink(e.target.value)}
                  rows={3}
                  placeholder="Ej: https://maps.app.goo.gl/... o 3.4358, -76.5469"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  autoFocus
                />

                {pasteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] leading-snug">
                    {pasteError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="w-1/3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!pastedLink.trim()}
                    className="w-2/3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Ubicar en el Mapa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
