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
  Layers,
  Edit2,
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
      return <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />;
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
  const tileLayerRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedLat, setSelectedLat] = useState<number>(initialLat || 3.4516);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || -76.532);
  const [selectedBarrio, setSelectedBarrio] = useState<string>(
    initialBarrio || getClosestBarrio(initialLat || 3.4516, initialLng || -76.532)
  );

  const [mapType, setMapType] = useState<"google_road" | "google_satellite" | "osm">("google_road");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedLink, setPastedLink] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [resolvingLink, setResolvingLink] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Reverse geocode to exact address/place
  const updateLocationCoordinates = async (lat: number, lng: number, explicitName?: string) => {
    setSelectedLat(lat);
    setSelectedLng(lng);

    if (explicitName) {
      setSelectedBarrio(explicitName);
    } else {
      try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.neighborhood) {
            setSelectedBarrio(data.neighborhood);
            return;
          }
        }
      } catch (err) {
        console.warn("Reverse geocoding error:", err);
      }
      setSelectedBarrio(getClosestBarrio(lat, lng));
    }
  };

  // Change Map Tile Layer
  const setTileLayerType = async (type: "google_road" | "google_satellite" | "osm") => {
    if (!mapInstanceRef.current) return;
    const L = (await import("leaflet")).default;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let layerUrl = "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
    let maxZoom = 20;

    if (type === "google_satellite") {
      layerUrl = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
    } else if (type === "osm") {
      layerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(layerUrl, {
      attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
      maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
    setMapType(type);
  };

  // Auto-detect clipboard on return from Google Maps
  useEffect(() => {
    const handleWindowFocus = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (
            text &&
            text.length > 5 &&
            (/maps\.google|goo\.gl|http.*map/i.test(text) ||
              /^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/.test(text.trim()))
          ) {
            handleResolveUrlOrCoords(text);
          }
        }
      } catch {
        // Silent if clipboard permission not granted
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  // Google Places Autocomplete SDK loader if API Key is configured
  useEffect(() => {
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey || typeof window === "undefined") return;

    const loadGooglePlaces = () => {
      if ((window as any).google?.maps?.places && searchInputRef.current) {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            componentRestrictions: { country: "co" },
            bounds: new (window as any).google.maps.LatLngBounds(
              new (window as any).google.maps.LatLng(3.2, -76.7),
              new (window as any).google.maps.LatLng(3.65, -76.35)
            ),
            fields: ["geometry", "name", "formatted_address"],
          }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            updateLocationCoordinates(lat, lng, place.formatted_address || place.name);

            if (mapInstanceRef.current && markerRef.current) {
              mapInstanceRef.current.setView([lat, lng], 17);
              markerRef.current.setLatLng([lat, lng]);
            }
          }
        });
      }
    };

    if (!(window as any).google?.maps?.places) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&language=es`;
      script.async = true;
      script.defer = true;
      script.onload = loadGooglePlaces;
      document.head.appendChild(script);
    } else {
      loadGooglePlaces();
    }
  }, []);

  // Initialize Map with Google Maps Tiles
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

        const googleRoadLayer = L.tileLayer(
          "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
          {
            attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
            maxZoom: 20,
          }
        ).addTo(map);

        tileLayerRef.current = googleRoadLayer;

        const marker = L.marker([selectedLat, selectedLng], {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on("dragend", (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          updateLocationCoordinates(lat, lng);
        });

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          updateLocationCoordinates(lat, lng);
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

  // Select place from autocomplete
  const handleSelectPlace = (place: PlaceResult) => {
    updateLocationCoordinates(place.lat, place.lng, place.display_name || place.name);
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
        await updateLocationCoordinates(data.lat, data.lng);
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
            "No pudimos detectar coordenadas en el enlace. Asegúrate de copiar el enlace de Google Maps o escribir coordenadas tipo: 3.4516, -76.5320"
        );
      }
    } catch (err: any) {
      setPasteError("Error al procesar el enlace de Google Maps.");
    } finally {
      setResolvingLink(false);
    }
  };

  // Open Google Maps Search in external tab
  const handleOpenGoogleMapsSearch = () => {
    const query = searchQuery.trim() || "Cali Colombia";
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query + " Cali Colombia")}/@${selectedLat},${selectedLng},16z`;
    window.open(url, "_blank");
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

        updateLocationCoordinates(lat, lng);
        setSearchQuery("");
        setSearchResults([]);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        setGettingGPS(false);
        alert("No se pudo obtener la señal GPS.");
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
    <div className="fixed inset-0 bg-stone-900/80 z-[70] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col h-[94vh] sm:h-[88vh] text-stone-900 shadow-2xl relative">
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
                Busca cualquier dirección, toca el mapa o abre Google Maps
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

        {/* Action Bar: Google Maps Search & Quick Tools */}
        <div className="p-2.5 sm:p-3 bg-stone-50 border-b border-stone-200 space-y-2 relative z-[2000]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Escribe dirección, barrio o negocio (Ej: Cl 5 # 34-12, Av 6N, Unicentro...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length === 0) {
                    handleOpenGoogleMapsSearch();
                  }
                }}
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

            {/* Direct Google Maps Search Button */}
            <button
              type="button"
              onClick={handleOpenGoogleMapsSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
              title="Buscar en Google Maps en pestaña externa"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Maps</span>
            </button>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingGPS}
              className="bg-white hover:bg-amber-50 text-amber-800 border border-stone-200 hover:border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap cursor-pointer"
              title="Obtener GPS actual"
            >
              {gettingGPS ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">Mi GPS</span>
            </button>
          </div>

          {/* Autocomplete Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-14 bg-white border border-stone-200 rounded-2xl shadow-2xl z-[3000] max-h-64 overflow-y-auto divide-y divide-stone-100 animate-fade-in">
              <div className="p-2 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                <span>Resultados Encontrados:</span>
                <button
                  type="button"
                  onClick={handleOpenGoogleMapsSearch}
                  className="text-blue-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                >
                  <span>Buscar en Google Maps ↗</span>
                </button>
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

        {/* Map View */}
        <div className="flex-1 w-full relative z-[10]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[280px]" />

          {/* Map Layer Switcher: Google Road vs Google Satellite */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl p-1 z-[1500] flex items-center gap-1 shadow-md">
            <button
              type="button"
              onClick={() => setTileLayerType("google_road")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                mapType === "google_road"
                  ? "bg-amber-500 text-white shadow-2xs font-extrabold"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Map className="w-3 h-3" />
              <span>Mapa</span>
            </button>
            <button
              type="button"
              onClick={() => setTileLayerType("google_satellite")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                mapType === "google_satellite"
                  ? "bg-amber-500 text-white shadow-2xs font-extrabold"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Satélite</span>
            </button>
          </div>

          {/* Selected Location Banner with Editable Details */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl p-3 z-[1500] flex flex-col gap-1.5 shadow-xl max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold">
                    Punto Exacto Fijado:
                  </span>
                  {isEditingAddress ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={selectedBarrio}
                        onChange={(e) => setSelectedBarrio(e.target.value)}
                        className="border border-amber-400 bg-white rounded-lg px-2 py-1 text-xs font-bold text-stone-900 focus:outline-none w-full"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="bg-amber-500 text-white px-2 py-1 rounded-lg text-xs font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <strong className="text-stone-900 font-extrabold text-sm block">
                        {selectedBarrio}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="text-stone-400 hover:text-amber-700 p-0.5"
                        title="Editar nombre"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <span className="text-[10.5px] text-stone-500 font-mono block mt-0.5">
                    GPS: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
                  </span>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps?q=${selectedLat},${selectedLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded-xl transition flex-shrink-0"
              >
                <span>Ver Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-600 font-medium hidden sm:block">
            📍 Coordenadas exactas guardadas:{" "}
            <strong className="font-mono text-stone-900">
              {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </strong>
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
              <span>Guardar Esta Ubicación Exacta</span>
            </button>
          </div>
        </div>

        {/* Modal: Pegar enlace de Google Maps */}
        {showPasteModal && (
          <div className="absolute inset-0 bg-stone-900/60 z-[4000] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
            <div className="bg-white border border-stone-200 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-blue-600" />
                  <h4 className="font-extrabold text-sm text-stone-900">
                    Pegar Enlace de Google Maps
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
                Pega cualquier enlace de Google Maps (de celular o navegador) o coordenadas:
              </p>

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
                    placeholder="Ej: https://maps.app.goo.gl/... o 3.4358, -76.5469"
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
                    <span>Fijar en Mapa</span>
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
