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
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#141417] border border-neutral-800 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col h-[92vh] sm:h-[82vh] text-white shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#19191e]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Seleccionar Ubicación en Cali y Jamundí
              </h3>
              <p className="text-xs text-neutral-400">
                Escribe el barrio, toca el mapa o activa tu GPS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & GPS Button */}
        <div className="p-3 bg-[#16161a] border-b border-neutral-800 space-y-2 relative z-[2000]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Escribe el barrio (Ej: Nápoles, Alfaguara, Meléndez, Valle del Lili...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition whitespace-nowrap"
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
              className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap"
            >
              {gettingGPS ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">GPS Actual</span>
            </button>
          </form>

          {/* Autocomplete Search Dropdown - Always on top of Leaflet map layers */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-14 bg-[#19191e] border border-neutral-700 rounded-xl shadow-2xl z-[3000] max-h-56 overflow-y-auto backdrop-blur-md">
              {searchResults.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(b)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-800 border-b border-neutral-800/80 last:border-0 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="font-bold text-white text-xs">{b.name}</span>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
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
          <div className="absolute top-3 left-3 right-3 sm:right-auto bg-black/90 backdrop-blur-md border border-neutral-700 rounded-xl p-2.5 z-[1500] flex items-center gap-2 shadow-2xl">
            <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">Barrio Seleccionado:</span>
              <strong className="text-amber-300 font-extrabold text-sm">{selectedBarrio}</strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-[#16161a] flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 hidden sm:block">
            Coordenadas: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-neutral-700 text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/20"
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
