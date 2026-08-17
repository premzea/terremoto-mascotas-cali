"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search, Check, X, Loader2 } from "lucide-react";
import barrioCoordsData from "@/data/coords_by_barrio.json";

interface BarrioInfo {
  name: string;
  lat: number;
  lng: number;
  comuna: string;
  zone?: string;
}

interface MapLocationPickerProps {
  initialBarrio?: string;
  initialLat?: number;
  initialLng?: number;
  onSelectLocation: (location: { neighborhood: string; lat: number; lng: number }) => void;
  onClose: () => void;
}

const barriosList = Object.values(barrioCoordsData) as BarrioInfo[];

// Strip accents and lowercase for fuzzy matching
function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
  const [searchResults, setSearchResults] = useState<BarrioInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      const L = (await import("leaflet")).default;

      // Custom high-contrast marker icon
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
          14
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

  // Live autocomplete filter (accent-insensitive)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = normalizeText(searchQuery);
    const matches = barriosList
      .filter((b) => {
        const normName = normalizeText(b.name);
        const normZone = b.zone ? normalizeText(b.zone) : "";
        return normName.includes(q) || normZone.includes(q);
      })
      .slice(0, 8);
    setSearchResults(matches);
  }, [searchQuery]);

  // Select Barrio from suggestions
  const handleSelectSearchResult = (b: BarrioInfo) => {
    setSelectedLat(b.lat);
    setSelectedLng(b.lng);
    setSelectedBarrio(b.name);
    setSearchQuery(b.name);
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([b.lat, b.lng], 15);
      markerRef.current.setLatLng([b.lat, b.lng]);
    }
  };

  // Perform full search on submit (Enter or click Buscar)
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = normalizeText(searchQuery);
    
    // 1. Check local exact/partial match
    const directMatch = barriosList.find(
      (b) => normalizeText(b.name) === q || normalizeText(b.name).includes(q)
    );

    if (directMatch) {
      handleSelectSearchResult(directMatch);
      return;
    }

    // 2. Fallback to OpenStreetMap Geocoding for specific addresses / landmarks
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery + ", Cali, Colombia"
      )}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lng);
        const nearest = getClosestBarrio(lat, lng);
        setSelectedBarrio(nearest);
        setSearchResults([]);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
        }
      } else {
        alert(`No se encontró "${searchQuery}". Puedes tocar el mapa directamente para ubicar el punto.`);
      }
    } catch (err) {
      console.warn("Geocoding fetch error:", err);
    } finally {
      setSearching(false);
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
        alert("No se pudo obtener la señal GPS. Por favor busca el barrio en el buscador o toca el mapa.");
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
    <div className="fixed inset-0 bg-stone-900/70 z-[70] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col h-[92vh] sm:h-[82vh] text-stone-900 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 shadow-2xs">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900">
                Seleccionar Ubicación en Cali y Jamundí
              </h3>
              <p className="text-xs text-stone-600">
                Escribe el barrio, toca el mapa o activa tu GPS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & GPS Button */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2 relative z-[2000]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Escribe el barrio (Ej: Nápoles, Alfaguara, Meléndez, Valle del Lili...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap active:scale-[0.98]"
            >
              {searching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Buscar</span>
            </button>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingGPS}
              className="bg-white hover:bg-amber-50 text-amber-800 border border-stone-200 hover:border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap"
            >
              {gettingGPS ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">GPS Actual</span>
            </button>
          </form>

          {/* Autocomplete Search Dropdown - Always on top of Leaflet map layers */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-14 bg-white border border-stone-200 rounded-xl shadow-2xl z-[3000] max-h-56 overflow-y-auto divide-y divide-stone-100">
              {searchResults.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(b)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="font-bold text-stone-900 text-xs">{b.name}</span>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 font-semibold">
                    {b.zone || `Comuna ${b.comuna}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 w-full relative z-[10]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />
          
          {/* Floating Current Barrio Pill */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl p-2.5 z-[1500] flex items-center gap-2 shadow-lg">
            <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-stone-500 block text-[10px] uppercase font-bold">Barrio Seleccionado:</span>
              <strong className="text-stone-900 font-extrabold text-sm">{selectedBarrio}</strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500 hidden sm:block">
            Coordenadas: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20 active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
