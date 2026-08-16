"use client";

import { useEffect, useState, useMemo } from "react";
import { PetReport } from "@/lib/types";
import { getPets } from "@/lib/data-service";
import UnsyncedBadge from "@/components/UnsyncedBadge";
import SplitHero from "@/components/SplitHero";
import PetCard from "@/components/PetCard";
import ReportModal from "@/components/ReportModal";
import MatchingModal from "@/components/MatchingModal";
import { Search, Filter, ShieldCheck, MapPin, AlertCircle, RefreshCw, Compass, Sparkles, SlidersHorizontal, X } from "lucide-react";
import barrioCoords from "@/data/coords_by_barrio.json";
import rawSeedPets from "@/data/seed_pets.json";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";

export default function Home() {
  const [pets, setPets] = useState<PetReport[]>([]);
  const [allPets, setAllPets] = useState<PetReport[]>(rawSeedPets as PetReport[]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Basic Filters
  const [speciesFilter, setSpeciesFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedBarrio, setSelectedBarrio] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Advanced Biometric Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>("ALL");
  const [selectedPattern, setSelectedPattern] = useState<string>("ALL");
  const [selectedEyeColor, setSelectedEyeColor] = useState<string>("ALL");
  const [selectedSize, setSelectedSize] = useState<string>("ALL");

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
        neighborhood: selectedBarrio,
        search: searchTerm,
      });
      setPets(data);
    } catch (e) {
      console.error("Error loading pets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [speciesFilter, typeFilter, selectedBarrio, searchTerm]);

  // Secondary In-Memory Filtering for Advanced Biometrics
  const filteredPets = useMemo(() => {
    const v2Map = visualFeaturesV2 as Record<string, any>;
    
    return pets.filter((p) => {
      const v2 = v2Map[p.id || ""] || {};
      
      // Color Filter
      if (selectedColor !== "ALL") {
        const colors: string[] = v2.coat_colors || [];
        const hasColor = colors.includes(selectedColor) || 
          (p.primary_color && p.primary_color.toLowerCase().includes(selectedColor.toLowerCase()));
        if (!hasColor) return false;
      }

      // Pattern Filter
      if (selectedPattern !== "ALL") {
        if (v2.coat_pattern && v2.coat_pattern !== selectedPattern) {
          return false;
        }
      }

      // Eye Color Filter
      if (selectedEyeColor !== "ALL") {
        if (v2.eye_color && v2.eye_color !== selectedEyeColor) {
          return false;
        }
      }

      // Size Filter
      if (selectedSize !== "ALL") {
        if (v2.size && v2.size !== selectedSize) {
          return false;
        }
      }

      return true;
    });
  }, [pets, selectedColor, selectedPattern, selectedEyeColor, selectedSize]);

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

  const clearAllFilters = () => {
    setSpeciesFilter("ALL");
    setTypeFilter("ALL");
    setSelectedBarrio("ALL");
    setSearchTerm("");
    setSelectedColor("ALL");
    setSelectedPattern("ALL");
    setSelectedEyeColor("ALL");
    setSelectedSize("ALL");
  };

  const hasActiveAdvancedFilters =
    selectedColor !== "ALL" ||
    selectedPattern !== "ALL" ||
    selectedEyeColor !== "ALL" ||
    selectedSize !== "ALL";

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col">
      {/* 1. Offline Unsynced Data Badge */}
      <UnsyncedBadge />

      {/* 2. Emergency Header */}
      <header className="bg-[#121214] border-b border-neutral-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600/20 border border-red-500/40 p-2 rounded-lg text-red-400 font-black text-xs">
              SOS
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                Red Mascotas Cali
                <span className="text-[10px] bg-red-600 font-bold px-1.5 py-0.5 rounded text-white uppercase">
                  Sismo Día 5
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400">
                Rescate, Búsqueda y Triaje de Emergencia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenReport("LOST")}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-3 py-2 rounded-lg transition shadow-md shadow-amber-950/30"
            >
              + Publicar Reporte
            </button>
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
        <div className="p-4 bg-[#141417] border-b border-neutral-800 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, barrio, raza o señas particulares..."
                className="w-full bg-[#1e1e24] border border-neutral-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 placeholder-neutral-500"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition ${
                showAdvancedFilters || hasActiveAdvancedFilters
                  ? "bg-amber-500 text-black border-amber-400"
                  : "bg-[#1e1e24] text-neutral-300 border-neutral-700 hover:border-neutral-600"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros IA</span>
              {hasActiveAdvancedFilters && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Filtros Básicos Rápidos */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filtro Especie */}
            <div className="flex bg-[#1e1e24] rounded-lg p-1 border border-neutral-800">
              <button
                onClick={() => setSpeciesFilter("ALL")}
                className={`px-2.5 py-1 rounded font-bold ${
                  speciesFilter === "ALL" ? "bg-amber-500 text-black" : "text-neutral-400"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSpeciesFilter("DOG")}
                className={`px-2.5 py-1 rounded font-bold ${
                  speciesFilter === "DOG" ? "bg-amber-500 text-black" : "text-neutral-400"
                }`}
              >
                🐶 Perros
              </button>
              <button
                onClick={() => setSpeciesFilter("CAT")}
                className={`px-2.5 py-1 rounded font-bold ${
                  speciesFilter === "CAT" ? "bg-amber-500 text-black" : "text-neutral-400"
                }`}
              >
                🐱 Gatos
              </button>
            </div>

            {/* Filtro Tipo */}
            <div className="flex bg-[#1e1e24] rounded-lg p-1 border border-neutral-800">
              <button
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded font-bold ${
                  typeFilter === "ALL" ? "bg-neutral-700 text-white" : "text-neutral-400"
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setTypeFilter("LOST")}
                className={`px-2.5 py-1 rounded font-bold ${
                  typeFilter === "LOST" ? "bg-red-600 text-white" : "text-neutral-400"
                }`}
              >
                Perdidos
              </button>
              <button
                onClick={() => setTypeFilter("FOUND")}
                className={`px-2.5 py-1 rounded font-bold ${
                  typeFilter === "FOUND" ? "bg-emerald-600 text-white" : "text-neutral-400"
                }`}
              >
                Encontrados
              </button>
            </div>

            {/* Filtro Barrio */}
            <div className="flex-1 min-w-[150px]">
              <select
                value={selectedBarrio}
                onChange={(e) => setSelectedBarrio(e.target.value)}
                className="w-full bg-[#1e1e24] border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">📍 Todos los sectores y comunas</option>
                {Object.keys(barrioCoords).sort().map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Panel de Filtros Avanzados por Rasgos Biométricos (Enums) */}
          {showAdvancedFilters && (
            <div className="p-3.5 bg-[#18181c] rounded-xl border border-neutral-800 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Filtrar por Rasgos Físicos (Clasificación IA)
                </span>
                {hasActiveAdvancedFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    <X className="w-3 h-3" /> Limpiar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Color de Pelaje */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    🎨 Color de Pelaje
                  </label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full bg-[#121215] border border-neutral-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="ALL">Cualquier color</option>
                    <option value="BLACK">Negro</option>
                    <option value="WHITE">Blanco</option>
                    <option value="ORANGE_RED">Naranja / Rubio / Rojizo</option>
                    <option value="GOLDEN_YELLOW">Amarillo / Miel / Dorado</option>
                    <option value="GRAY_SILVER">Gris / Plomo / Plateado</option>
                    <option value="BROWN">Marrón / Café / Chocolate</option>
                    <option value="CREAM">Crema</option>
                  </select>
                </div>

                {/* 2. Patrón de Pelaje */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    ✨ Patrón de Pelaje
                  </label>
                  <select
                    value={selectedPattern}
                    onChange={(e) => setSelectedPattern(e.target.value)}
                    className="w-full bg-[#121215] border border-neutral-700 rounded-lg p-1.5 text-xs text-white"
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

                {/* 3. Color de Ojos */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    👁️ Color de Ojos
                  </label>
                  <select
                    value={selectedEyeColor}
                    onChange={(e) => setSelectedEyeColor(e.target.value)}
                    className="w-full bg-[#121215] border border-neutral-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="ALL">Cualquier color de ojos</option>
                    <option value="BROWN">Castaño / Marrón</option>
                    <option value="GREEN">Verde</option>
                    <option value="AMBER">Ámbar / Amarillo</option>
                    <option value="BLUE">Azul</option>
                    <option value="HETEROCHROMIA">Heterocromía (Ojos distintos)</option>
                  </select>
                </div>

                {/* 4. Tamaño Estimado */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    📏 Tamaño Corporal
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full bg-[#121215] border border-neutral-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="ALL">Cualquier tamaño</option>
                    <option value="SMALL">Pequeño (Mini / Gato / Chihuahua)</option>
                    <option value="MEDIUM">Mediano (Beagle / Criollo)</option>
                    <option value="LARGE">Grande (Pastor / Labrador / Husky)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Lista de Resultados / Cards */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span>
              Mostrando <strong className="text-white">{filteredPets.length}</strong> de{" "}
              {allPets.length} reportes en Cali
            </span>
            {(speciesFilter !== "ALL" || typeFilter !== "ALL" || selectedBarrio !== "ALL" || searchTerm || hasActiveAdvancedFilters) && (
              <button
                onClick={clearAllFilters}
                className="text-amber-400 hover:underline font-semibold"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <p className="text-xs">Cargando base de datos de emergencia...</p>
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="text-center p-12 bg-neutral-900/30 rounded-2xl border border-neutral-800 space-y-3">
              <Compass className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="font-extrabold text-base text-white">No se encontraron mascotas con estos filtros</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Intenta buscar con términos más amplios o limpia los filtros para ver todos los reportes.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
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
          onClose={() => setReportModalOpen(false)}
          onSuccess={handleNewReportCreated}
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
