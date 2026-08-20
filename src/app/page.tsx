"use client";

import { useEffect, useState, useMemo } from "react";
import { PetReport } from "@/lib/types";
import { getPets } from "@/lib/data-service";
import UnsyncedBadge from "@/components/UnsyncedBadge";
import SplitHero from "@/components/SplitHero";
import PetCard from "@/components/PetCard";
import ReportModal from "@/components/ReportModal";
import MatchingModal from "@/components/MatchingModal";
import { Search, Filter, ShieldCheck, MapPin, AlertCircle, RefreshCw, Compass, Sparkles, SlidersHorizontal, X, Navigation, Check, Mail } from "lucide-react";
import barrioCoords from "@/data/coords_by_barrio.json";
import rawSeedPets from "@/data/seed_pets.json";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";
import { searchPetsWithSynonyms } from "@/lib/search/synonym-search";

function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [pets, setPets] = useState<PetReport[]>([]);
  const [allPets, setAllPets] = useState<PetReport[]>(rawSeedPets as PetReport[]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Basic Filters
  const [speciesFilter, setSpeciesFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [selectedBarrio, setSelectedBarrio] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Zone text search & GPS Proximity
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lng: number; barrioName: string } | null>(null);
  const [gettingGps, setGettingGps] = useState<boolean>(false);
  const [zoneInputQuery, setZoneInputQuery] = useState<string>("");
  const [showZoneDropdown, setShowZoneDropdown] = useState<boolean>(false);

  // Advanced Biometric & Trait Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string>("ALL");
  const [selectedEyeColor, setSelectedEyeColor] = useState<string>("ALL");
  const [selectedSize, setSelectedSize] = useState<string>("ALL");
  const [selectedNeutered, setSelectedNeutered] = useState<string>("ALL");
  const [selectedBreed, setSelectedBreed] = useState<string>("ALL");
  const [selectedFurLength, setSelectedFurLength] = useState<string>("ALL");

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportModalType, setReportModalType] = useState<"LOST" | "FOUND">("LOST");
  const [matchingTargetPet, setMatchingTargetPet] = useState<PetReport | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPets({
        species: speciesFilter,
        report_type: typeFilter,
        gender: genderFilter,
        neighborhood: selectedBarrio,
      });
      setPets(data);
      if (
        speciesFilter === "ALL" &&
        typeFilter === "ALL" &&
        genderFilter === "ALL" &&
        selectedBarrio === "ALL"
      ) {
        setAllPets(data);
      }
    } catch (e) {
      console.error("Error loading pets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [speciesFilter, typeFilter, genderFilter, selectedBarrio]);

  // Live suggestions for Zone/Barrio search
  const zoneSuggestions = useMemo(() => {
    if (!zoneInputQuery.trim()) return [];
    const q = normalizeText(zoneInputQuery);
    return (Object.values(barrioCoords) as any[])
      .filter((b) => {
        const normName = normalizeText(b.name);
        const normZone = b.zone ? normalizeText(b.zone) : "";
        return normName.includes(q) || normZone.includes(q);
      })
      .slice(0, 8);
  }, [zoneInputQuery]);

  // GPS Locate User
  const handleLocateNearMe = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización");
      return;
    }

    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Find nearest barrio
        let minDistance = Infinity;
        let closest = "Cali Centro";
        for (const b of Object.values(barrioCoords) as any[]) {
          const d = (b.lat - lat) ** 2 + (b.lng - lng) ** 2;
          if (d < minDistance) {
            minDistance = d;
            closest = b.name;
          }
        }

        setUserGpsLocation({ lat, lng, barrioName: closest });
        setSelectedBarrio(closest);
        setZoneInputQuery(closest);
        setShowZoneDropdown(false);
      },
      (err) => {
        setGettingGps(false);
        alert("No se pudo obtener la señal GPS. Por favor escribe el nombre de tu barrio.");
        console.warn("GPS error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Secondary In-Memory Filtering for Advanced Biometrics + GPS Distance Sorting
  const filteredPets = useMemo(() => {
    const v2Map = visualFeaturesV2 as Record<string, any>;
    
    let list = pets.filter((p) => {
      const v2 = v2Map[p.id || ""] || {};
      const features = (p.distinctive_features || "").toLowerCase();
      const pColor = (p.primary_color || "").toLowerCase();
      
      // 1. Multi-Color Filter (matches if pet has ANY of the selected colors)
      if (selectedColors.length > 0) {
        const colors: string[] = (v2.coat_colors || []).map((c: string) => c.toLowerCase());
        const hasColorMatch = selectedColors.some((sc) => {
          const scKey = sc.toLowerCase();
          // Match by enum or localized Spanish string
          const colorTranslations: Record<string, string[]> = {
            black: ["negro", "black", "negra"],
            white: ["blanco", "white", "blanca"],
            brown: ["marrón", "cafe", "café", "chocolate", "brown"],
            golden_yellow: ["amarillo", "dorado", "miel", "rubio", "golden", "yellow"],
            orange_red: ["naranja", "rojo", "rojizo", "orange", "red"],
            gray_silver: ["gris", "plomo", "plateado", "gray", "silver"],
            cream: ["crema", "beige", "cream"],
          };
          const words = colorTranslations[scKey] || [scKey];
          return (
            colors.includes(scKey) ||
            words.some((w) => pColor.includes(w) || features.includes(w))
          );
        });
        if (!hasColorMatch) return false;
      }

      // 2. Castration / Neutered Filter
      if (selectedNeutered !== "ALL") {
        if (selectedNeutered === "CASTRADO") {
          const isNeutered =
            features.includes("castrado") ||
            features.includes("esterilizado") ||
            features.includes("macho castrado");
          if (!isNeutered) return false;
        } else if (selectedNeutered === "NO_CASTRADO") {
          const isNotNeutered =
            features.includes("sin castrar") ||
            features.includes("sin esterilizar") ||
            features.includes("no castrado");
          if (!isNotNeutered) return false;
        }
      }

      // 3. Breed Filter
      if (selectedBreed !== "ALL") {
        const qBreed = selectedBreed.toLowerCase();
        const matchesBreed =
          (v2.breed_likely && v2.breed_likely.toLowerCase().includes(qBreed)) ||
          features.includes(qBreed);
        if (!matchesBreed) return false;
      }

      // 4. Fur Length Filter
      if (selectedFurLength !== "ALL") {
        if (v2.fur_length && v2.fur_length !== selectedFurLength) {
          const furTranslations: Record<string, string[]> = {
            SHORT: ["pelo corto", "raso", "corto"],
            MEDIUM: ["pelo medio", "mediano", "semilargo"],
            LONG: ["pelo largo", "largo", "esponjoso", "abundante"],
          };
          const words = furTranslations[selectedFurLength] || [];
          const hasFurWord = words.some((w) => features.includes(w));
          if (!hasFurWord) return false;
        }
      }

      // 5. Pattern Filter
      if (selectedPattern !== "ALL") {
        if (v2.coat_pattern && v2.coat_pattern !== selectedPattern) {
          return false;
        }
      }

      // 6. Eye Color Filter
      if (selectedEyeColor !== "ALL") {
        if (v2.eye_color && v2.eye_color !== selectedEyeColor) {
          return false;
        }
      }

      // 7. Size Filter
      if (selectedSize !== "ALL") {
        if (v2.size && v2.size !== selectedSize) {
          return false;
        }
      }

      // 8. Sex / Gender Filter
      if (genderFilter !== "ALL") {
        const pGender = (p.gender || "").toUpperCase();
        if (genderFilter === "HEMBRA") {
          const isFemale = pGender === "HEMBRA" || features.includes("hembra") || features.includes("hembra esterilizada");
          if (!isFemale) return false;
        } else if (genderFilter === "MACHO") {
          const isMale = pGender === "MACHO" || features.includes("macho") || features.includes("macho castrado");
          if (!isMale) return false;
        } else if (genderFilter === "UNKNOWN") {
          const isUnknown = (!pGender || pGender === "UNKNOWN") && !features.includes("hembra") && !features.includes("macho");
          if (!isUnknown) return false;
        }
      }

      return true;
    });

    // 9. Semantic Multi-Keyword + Synonym Search & Relevance Ranking
    if (searchTerm && searchTerm.trim()) {
      const searchResults = searchPetsWithSynonyms(searchTerm.trim(), list);
      list = searchResults.map((r) => r.pet);
    } else if (userGpsLocation) {
      list = [...list].sort((a, b) => {
        const aLat = a.lat || (barrioCoords as any)[a.neighborhood?.toLowerCase()]?.lat || 3.4516;
        const aLng = a.lng || (barrioCoords as any)[a.neighborhood?.toLowerCase()]?.lng || -76.532;
        const bLat = b.lat || (barrioCoords as any)[b.neighborhood?.toLowerCase()]?.lat || 3.4516;
        const bLng = b.lng || (barrioCoords as any)[b.neighborhood?.toLowerCase()]?.lng || -76.532;

        const distA = calculateDistanceKm(userGpsLocation.lat, userGpsLocation.lng, aLat, aLng);
        const distB = calculateDistanceKm(userGpsLocation.lat, userGpsLocation.lng, bLat, bLng);
        return distA - distB;
      });
    }

    return list;
  }, [
    pets,
    searchTerm,
    genderFilter,
    selectedColors,
    selectedNeutered,
    selectedBreed,
    selectedFurLength,
    selectedPattern,
    selectedEyeColor,
    selectedSize,
    userGpsLocation,
  ]);

  const handleOpenReport = (type: "LOST" | "FOUND") => {
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const handleNewReportCreated = (newPet: PetReport) => {
    setPets((prev) => [newPet, ...prev]);
    setAllPets((prev) => [newPet, ...prev]);
    setTimeout(() => {
      setMatchingTargetPet(newPet);
    }, 400);
  };

  const handleClosePetCase = (petId: string) => {
    setPets((prev) => prev.filter((p) => p.id !== petId));
    setAllPets((prev) => prev.filter((p) => p.id !== petId));
  };

  const clearAllFilters = () => {
    setSpeciesFilter("ALL");
    setTypeFilter("ALL");
    setGenderFilter("ALL");
    setSelectedBarrio("ALL");
    setUserGpsLocation(null);
    setZoneInputQuery("");
    setShowZoneDropdown(false);
    setSearchTerm("");
    setSelectedColors([]);
    setSelectedNeutered("ALL");
    setSelectedBreed("ALL");
    setSelectedFurLength("ALL");
    setSelectedPattern("ALL");
    setSelectedEyeColor("ALL");
    setSelectedSize("ALL");
  };

  const hasActiveAdvancedFilters =
    genderFilter !== "ALL" ||
    selectedColors.length > 0 ||
    selectedNeutered !== "ALL" ||
    selectedBreed !== "ALL" ||
    selectedFurLength !== "ALL" ||
    selectedPattern !== "ALL" ||
    selectedEyeColor !== "ALL" ||
    selectedSize !== "ALL";

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col">
      {/* 1. Offline Unsynced Data Badge */}
      <UnsyncedBadge />

      {/* 2. Emergency Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-rose-50 border border-rose-200/80 p-2 rounded-xl text-rose-600 font-black text-xs shadow-xs">
              SOS
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-stone-900 flex items-center gap-2">
                Búsqueda Animal Cali
              </h1>
              <p className="text-[11px] text-stone-500">
                Rescate, Búsqueda y Triaje de Emergencia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Red Activa
            </span>
          </div>
        </div>
      </header>

      {/* 3. 50/50 Split Action Hero */}
      <main className="flex-1 max-w-4xl w-full mx-auto pb-16">
        <SplitHero
          onOpenReport={handleOpenReport}
          activeFilter={typeFilter}
          onFilterChange={(t) => setTypeFilter(t)}
        />

        {/* 4. Barra de Filtros Barriales y Búsqueda */}
        <div className="p-4 bg-white border-b border-stone-200 space-y-3 shadow-xs">
          {/* Aviso de Atención y Contacto */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-950 shadow-2xs">
            <Mail className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span className="text-[11.5px] leading-snug">
              Cualquier duda, inquietud o queja, puedes escribir a{" "}
              <a
                href="mailto:busquedanimalcali@gmail.com"
                className="font-extrabold text-amber-900 underline hover:text-amber-950 transition"
              >
                busquedanimalcali@gmail.com
              </a>
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, barrio, raza o señas particulares..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400 transition"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                showAdvancedFilters || hasActiveAdvancedFilters
                  ? "bg-amber-500 text-white border-amber-500 shadow-amber-500/20"
                  : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveAdvancedFilters && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Filtros Básicos Rápidos */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filtro Especie */}
            <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
              <button
                onClick={() => setSpeciesFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  speciesFilter === "ALL" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSpeciesFilter("DOG")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  speciesFilter === "DOG" ? "bg-amber-500 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                🐶 Perros
              </button>
              <button
                onClick={() => setSpeciesFilter("CAT")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  speciesFilter === "CAT" ? "bg-amber-500 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                🐱 Gatos
              </button>
            </div>

            {/* Filtro Tipo */}
            <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
              <button
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  typeFilter === "ALL" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setTypeFilter("LOST")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  typeFilter === "LOST" ? "bg-orange-500 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Perdidos
              </button>
              <button
                onClick={() => setTypeFilter("FOUND")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  typeFilter === "FOUND" ? "bg-emerald-600 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Encontrados
              </button>
            </div>

            {/* Filtro Sexo */}
            <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200" id="filter-gender-group">
              <button
                onClick={() => setGenderFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  genderFilter === "ALL" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setGenderFilter("HEMBRA")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  genderFilter === "HEMBRA" ? "bg-rose-500 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                ♀ Hembra
              </button>
              <button
                onClick={() => setGenderFilter("MACHO")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  genderFilter === "MACHO" ? "bg-sky-600 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                ♂ Macho
              </button>
              <button
                onClick={() => setGenderFilter("UNKNOWN")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  genderFilter === "UNKNOWN" ? "bg-stone-700 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
                title="Sexo desconocido o por definir"
              >
                ❓ Desconocido
              </button>
            </div>

            {/* Filtro Zona / Barrio con Búsqueda Escrita y GPS Cerca de Mí */}
            <div className="flex-1 min-w-[220px] relative">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={selectedBarrio !== "ALL" ? selectedBarrio : zoneInputQuery}
                    onChange={(e) => {
                      setSelectedBarrio("ALL");
                      setUserGpsLocation(null);
                      setZoneInputQuery(e.target.value);
                      setShowZoneDropdown(true);
                    }}
                    onFocus={() => setShowZoneDropdown(true)}
                    placeholder="Escribe un barrio (Ej: Nápoles, Lili...)"
                    className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-amber-500 focus:bg-white placeholder:text-stone-400 transition"
                  />
                  {(selectedBarrio !== "ALL" || zoneInputQuery) && (
                    <button
                      onClick={() => {
                        setSelectedBarrio("ALL");
                        setUserGpsLocation(null);
                        setZoneInputQuery("");
                        setShowZoneDropdown(false);
                      }}
                      className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleLocateNearMe}
                  disabled={gettingGps}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition whitespace-nowrap shadow-2xs ${
                    userGpsLocation
                      ? "bg-amber-500 text-white border-amber-500 font-extrabold shadow-sm shadow-amber-500/20"
                      : "bg-stone-50 text-amber-800 border-stone-200 hover:bg-stone-100"
                  }`}
                  title="Filtrar por ubicación actual"
                >
                  {gettingGps ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span className="hidden sm:inline">Cerca de mí</span>
                  <span className="sm:hidden">GPS</span>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showZoneDropdown && zoneSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-10 bg-white border border-stone-200 rounded-xl shadow-xl z-40 max-h-48 overflow-y-auto divide-y divide-stone-100">
                  {zoneSuggestions.map((b: any) => (
                    <button
                      key={b.name}
                      onClick={() => {
                        setSelectedBarrio(b.name);
                        setZoneInputQuery(b.name);
                        setShowZoneDropdown(false);
                        setUserGpsLocation(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50/60 flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span className="font-bold text-stone-900">{b.name}</span>
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded font-semibold">
                        {b.zone || `Comuna ${b.comuna}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Banner de Proximidad GPS Activa */}
          {userGpsLocation && (
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                <span>
                  Mascotas ordenadas por cercanía a tu GPS (zona: <strong>{userGpsLocation.barrioName}</strong>)
                </span>
              </div>
              <button
                onClick={() => {
                  setUserGpsLocation(null);
                  setSelectedBarrio("ALL");
                  setZoneInputQuery("");
                }}
                className="text-amber-800 hover:text-amber-950 underline text-[11px] font-bold ml-2"
              >
                ✕ Desactivar GPS
              </button>
            </div>
          )}

          {/* Panel de Filtros Avanzados por Rasgos Biométricos (Enums) */}
          {showAdvancedFilters && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-4 animate-fade-in text-xs shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <span className="font-extrabold text-amber-800 flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Filtrar por Rasgos Físicos y Biométricos
                </span>
                {hasActiveAdvancedFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-stone-600 hover:text-stone-900 flex items-center gap-1 text-xs bg-white border border-stone-200 px-2 py-1 rounded-md transition shadow-2xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> Limpiar filtros
                  </button>
                )}
              </div>

              {/* 1. Selección Múltiple de Colores de Pelaje */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                    🎨 Colores de Pelaje (puedes marcar varios):
                  </label>
                  {selectedColors.length > 0 && (
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                      {selectedColors.length} seleccionado(s)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "BLACK", label: "Negro", bg: "#1f2937", border: "#374151" },
                    { id: "WHITE", label: "Blanco", bg: "#ffffff", text: "#000000", border: "#d1d5db" },
                    { id: "BROWN", label: "Café / Marrón", bg: "#78350f", border: "#92400e" },
                    { id: "GOLDEN_YELLOW", label: "Dorado / Amarillo", bg: "#d97706", border: "#f59e0b" },
                    { id: "ORANGE_RED", label: "Naranja / Rojo", bg: "#ea580c", border: "#f97316" },
                    { id: "GRAY_SILVER", label: "Gris / Plateado", bg: "#6b7280", border: "#9ca3af" },
                    { id: "CREAM", label: "Crema / Beige", bg: "#fef3c7", text: "#78350f", border: "#fde68a" },
                  ].map((color) => {
                    const isSelected = selectedColors.includes(color.id);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          setSelectedColors((prev) =>
                            isSelected
                              ? prev.filter((c) => c !== color.id)
                              : [...prev, color.id]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
                          isSelected
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                          style={{ backgroundColor: color.bg }}
                        />
                        {color.label}
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Grid de Filtros de Sexo, Castración, Raza, Largo de Pelo y Tamaño */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1 border-t border-stone-200">
                {/* Sexo / Género */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    ⚧️ Sexo / Género
                  </label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquiera (Todos)</option>
                    <option value="HEMBRA">♀ Hembra</option>
                    <option value="MACHO">♂ Macho</option>
                    <option value="UNKNOWN">❓ Desconocido</option>
                  </select>
                </div>

                {/* Castrado / Esterilizado */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    ✂️ ¿Castrado / Esterilizado?
                  </label>
                  <select
                    value={selectedNeutered}
                    onChange={(e) => setSelectedNeutered(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquiera (Todos)</option>
                    <option value="CASTRADO">Sí (Castrado / Esterilizado)</option>
                    <option value="NO_CASTRADO">No (Sin castrar)</option>
                  </select>
                </div>

                {/* Raza de Mascota */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    🐕 Raza (Frecuentes)
                  </label>
                  <select
                    value={selectedBreed}
                    onChange={(e) => setSelectedBreed(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquier raza</option>
                    <option value="Criollo">Criollo / Mestizo</option>
                    <option value="Pitbull">Pitbull</option>
                    <option value="Labrador">Labrador</option>
                    <option value="Poodle">Poodle / Caniche</option>
                    <option value="Pinscher">Pinscher</option>
                    <option value="Husky">Husky Siberiano</option>
                    <option value="Pug">Pug</option>
                    <option value="Pastor">Pastor Alemán</option>
                    <option value="Siamés">Gato Siamés</option>
                    <option value="Persa">Gato Persa</option>
                  </select>
                </div>

                {/* Largo del Pelo */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    🦁 Largo del Pelaje
                  </label>
                  <select
                    value={selectedFurLength}
                    onChange={(e) => setSelectedFurLength(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquier largo</option>
                    <option value="SHORT">Corto / Raso</option>
                    <option value="MEDIUM">Medio / Semilargo</option>
                    <option value="LONG">Largo / Abundante / Esponjoso</option>
                  </select>
                </div>

                {/* Tamaño Corporal */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    📏 Tamaño Corporal
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquier tamaño</option>
                    <option value="PEQUEÑO">Pequeño (Mini / Cachorro / Gato)</option>
                    <option value="MEDIANO">Mediano (Criollo / Beagle)</option>
                    <option value="GRANDE">Grande (Labrador / Husky / Pastor)</option>
                  </select>
                </div>
              </div>

              {/* 3. Grid de Patrón y Color de Ojos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-200">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    ✨ Patrón de Pelaje
                  </label>
                  <select
                    value={selectedPattern}
                    onChange={(e) => setSelectedPattern(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquier patrón</option>
                    <option value="SOLID">Sólido / Unicolor</option>
                    <option value="BICOLOR_TUXEDO">Bicolor / Tuxedo</option>
                    <option value="STRIPED_TABBY">Rayas / Atigrado (Tabby)</option>
                    <option value="SPOTTED">Manchas</option>
                    <option value="PATCHED_CALICO">Calicó / Carey</option>
                    <option value="MERLE_BRINDLE">Abigarrado / Brindle</option>
                    <option value="POINTED_SIAMESE">Siamés (Pointed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    👁️ Color de Ojos
                  </label>
                  <select
                    value={selectedEyeColor}
                    onChange={(e) => setSelectedEyeColor(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs font-medium"
                  >
                    <option value="ALL">Cualquier color de ojos</option>
                    <option value="BROWN">Castaño / Marrón</option>
                    <option value="GREEN">Verde</option>
                    <option value="AMBER">Ámbar / Amarillo</option>
                    <option value="BLUE">Azul</option>
                    <option value="HETEROCHROMIA">Heterocromía (Ojos distintos)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Lista de Resultados / Cards */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>
              Mostrando <strong className="text-stone-900">{filteredPets.length}</strong> de{" "}
              {allPets.length} reportes en Cali
            </span>
            {(speciesFilter !== "ALL" || typeFilter !== "ALL" || selectedBarrio !== "ALL" || searchTerm || hasActiveAdvancedFilters) && (
              <button
                onClick={clearAllFilters}
                className="text-amber-700 hover:text-amber-900 font-bold underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <p className="text-xs font-semibold">Cargando base de datos de emergencia...</p>
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <Compass className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-extrabold text-base text-stone-900">No se encontraron mascotas con estos filtros</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Intenta buscar con términos más amplios o limpia los filtros para ver todos los reportes.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition"
              >
                Ver todos los reportes
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredPets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onFindMatches={(target) => setMatchingTargetPet(target)}
                  onCloseCase={handleClosePetCase}
                  onUpdatePet={(updatedPet) => {
                    setPets((prev) => prev.map((p) => (p.id === updatedPet.id ? updatedPet : p)));
                    setAllPets((prev) => prev.map((p) => (p.id === updatedPet.id ? updatedPet : p)));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 6. Modal de Nuevo Reporte */}
      {reportModalOpen && (
        <ReportModal
          initialType={reportModalType}
          allPets={allPets}
          onClose={() => setReportModalOpen(false)}
          onSuccess={handleNewReportCreated}
          onSelectExistingPet={(existingPet) => {
            setSearchTerm(existingPet.name || existingPet.id || "");
            setReportModalOpen(false);
          }}
        />
      )}

      {/* 7. Modal de Coincidencias IA */}
      {matchingTargetPet && (
        <MatchingModal
          targetPet={matchingTargetPet}
          allPets={allPets}
          onClose={() => setMatchingTargetPet(null)}
        />
      )}
    </div>
  );
}
