"use client";

import { useEffect, useRef, useState } from "react";
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
  Map,
  Compass,
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
  const [resolvingLink, setResolvingLink] = useState(false);

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

    // Check if input looks like a Google Maps link or coordinates
    if (/maps\.google|goo\.gl|http|\d+\.\d+.*[,\s]+\d+\.\d+/.test(searchQuery)) {
      handleResolveUrlOrCoords(searchQuery);
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

  // Resolve link or coordinates via server endpoint
  const handleResolveUrlOrCoords = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;

    setResolvingLink(true);
    setPasteError(null);

    try {
      const res = await fetch("/api/resolve-maps-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: textToProcess.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.lat && data.lng) {
        setSelectedLat(data.lat);
        setSelectedLng(data.lng);
        const nearest = getClosestBarrio(data.lat, data.lng);
        setSelectedBarrio(nearest);
        setShowPasteModal(false);
        setPastedLink("");
        setSearchQuery("");

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([data.lat, data.lng], 16);
          markerRef.current.setLatLng([data.lat, data.lng]);
        }
      } else {
        setPasteError(
          data.error ||
            "No pudimos detectar coordenadas en el enlace. Asegúrate de copiar el enlace completo de Google Maps o escribir coordenadas tipo: 3.4516, -76.5320"
        );
      }
    } catch (err: any) {
      setPasteError("Error de conexión al procesar el enlace.");
    } finally {
      setResolvingLink(false);
    }
  };

  // Paste directly from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedLink(text);
          handleResolveUrlOrCoords(text);
        }
      }
    } catch (err) {
      console.warn("Clipboard read permission denied:", err);
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
        alert("No se pudo obtener la señal GPS. Puedes buscar el lugar en la barra o abrir Google Maps.");
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
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col h-[94vh] sm:h-[86vh] text-stone-900 shadow-2xl relative">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-amber-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-2xl border border-amber-300 shadow-2xs">
              <MapPin className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">
                Ubicación Exacta de la Mascota
              </h3>
              <p className="text-xs text-stone-600">
                Abre Google Maps, busca el punto exacto y pégalo aquí con 1 clic
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

        {/* Google Maps Direct Integration Banner */}
        <div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-950 font-bold">
            <Map className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>¿Prefieres buscar en Google Maps?</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Step 1: Open Google Maps */}
            <a
              href="https://www.google.com/maps/search/Cali,+Colombia/@3.4516,-76.532,14z"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>1. Abrir Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Step 2: Paste Link / Coords */}
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 font-extrabold px-3 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Pegar Ubicación</span>
            </button>
          </div>
        </div>

        {/* Live Search Bar & Action Buttons */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2 relative z-[2000]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca un lugar o pega un enlace de Google Maps aquí..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              {searching || resolvingLink ? (
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

            {/* GPS Locate Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingGPS}
              className="bg-white hover:bg-amber-50 text-amber-800 border border-stone-200 hover:border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap cursor-pointer"
              title="Obtener ubicación GPS actual de tu celular"
            >
              {gettingGPS ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">Mi GPS</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-14 bg-white border border-stone-200 rounded-2xl shadow-2xl z-[3000] max-h-60 overflow-y-auto divide-y divide-stone-100 animate-fade-in">
              <div className="p-2 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Sitios y Lugares Encontrados:
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
                    Fijar punto 📍
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 w-full relative z-[10]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[280px]" />

          {/* Floating Current Location Pill */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl p-3 z-[1500] flex items-center justify-between gap-3 shadow-lg">
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
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl transition"
              title="Abrir este punto en Google Maps"
            >
              <span>Ver en Maps</span>
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
            <div className="bg-white border border-stone-200 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-blue-600" />
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

              <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
                <p>
                  1. En Google Maps, toca <strong>Compartir</strong> $\rightarrow$ <strong>Copiar enlace</strong> (o copia las coordenadas).
                </p>
                <p>
                  2. Pégalo aquí o pulsa el botón para pegarlo automáticamente del portapapeles:
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResolveUrlOrCoords(pastedLink);
                }}
                className="space-y-3"
              >
                <div className="relative">
                  <textarea
                    value={pastedLink}
                    onChange={(e) => setPastedLink(e.target.value)}
                    rows={3}
                    placeholder="Pega aquí el enlace (https://maps.app.goo.gl/... o 3.4516, -76.5320)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="absolute right-2.5 bottom-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Pegar Portapapeles</span>
                  </button>
                </div>

                {pasteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] leading-snug">
                    {pasteError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resolvingLink || !pastedLink.trim()}
                    className="w-2/3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {resolvingLink ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                    <span>Ubicar en el Mapa</span>
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
