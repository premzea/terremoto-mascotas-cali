"use client";

import { useEffect, useState } from "react";
import { PetReport } from "@/lib/types";
import { getPets } from "@/lib/data-service";
import UnsyncedBadge from "@/components/UnsyncedBadge";
import SplitHero from "@/components/SplitHero";
import PetCard from "@/components/PetCard";
import ReportModal from "@/components/ReportModal";
import MatchingModal from "@/components/MatchingModal";
import { Search, Filter, ShieldCheck, MapPin, AlertCircle, RefreshCw, Compass, Sparkles } from "lucide-react";
import barrioCoords from "@/data/coords_by_barrio.json";
import rawSeedPets from "@/data/seed_pets.json";

export default function Home() {
  const [pets, setPets] = useState<PetReport[]>([]);
  const [allPets, setAllPets] = useState<PetReport[]>(rawSeedPets as PetReport[]);
  const [loading, setLoading] = useState<boolean>(true);
  const [speciesFilter, setSpeciesFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedBarrio, setSelectedBarrio] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
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

  const handleOpenReport = (type: "LOST" | "FOUND") => {
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const handleNewReportCreated = (newPet: PetReport) => {
    setPets((prev) => [newPet, ...prev]);
    setAllPets((prev) => [newPet, ...prev]);
    // Abrir automáticamente el modal de coincidencias para el nuevo reporte
    setTimeout(() => {
      setMatchingTargetPet(newPet);
    }, 400);
  };

  const clearAllFilters = () => {
    setSpeciesFilter("ALL");
    setTypeFilter("ALL");
    setSelectedBarrio("ALL");
    setSearchTerm("");
  };

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
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, color, raza o rasgos (ej: pastor holandes, salchicha)..."
              className="w-full bg-[#1e1e24] border border-neutral-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 placeholder-neutral-500"
            />
          </div>

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
            <select
              value={selectedBarrio}
              onChange={(e) => setSelectedBarrio(e.target.value)}
              className="bg-[#1e1e24] border border-neutral-700 text-neutral-300 font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              <option value="ALL">📍 Toda Cali (Barrios)</option>
              {Object.keys(barrioCoords).map((b) => (
                <option key={b} value={b}>
                  Barrio {b.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Contador de Registros */}
        <div className="px-4 py-2 bg-[#0d0d0f] border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Mostrando <strong>{pets.length}</strong> reportes de emergencia
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" /> Triaje Protegido
          </span>
        </div>

        {/* 6. Feed de Tarjetas de Borde a Borde */}
        {loading ? (
          <div className="p-12 text-center text-neutral-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
            <p className="text-xs">Cargando base de datos de mascotas de Cali...</p>
          </div>
        ) : pets.length > 0 ? (
          <div className="divide-y divide-neutral-800">
            {pets.map((pet, idx) => (
              <PetCard
                key={`${pet.report_type}-${pet.id}-${idx}`}
                pet={pet}
                onFindMatches={(p) => setMatchingTargetPet(p)}
              />
            ))}
          </div>
        ) : (
          /* 7. Active Empty State (Pass 4 de Diseño) */
          <div className="p-8 text-center bg-neutral-900/40 border border-dashed border-neutral-800 m-4 rounded-2xl space-y-4">
            <div className="bg-amber-500/10 text-amber-400 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                No hay reportes con estos filtros exactos
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Es común que los animales asustados por el temblor se hayan desplazado varios kilómetros hacia otros barrios.
              </p>
            </div>
            <button
              onClick={clearAllFilters}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-3.5 px-6 rounded-xl shadow-lg shadow-amber-950/40 transition"
            >
              Ampliar Búsqueda a Toda la Ciudad
            </button>
          </div>
        )}
      </main>

      {/* Modal de Reporte */}
      {reportModalOpen && (
        <ReportModal
          initialType={reportModalType}
          onClose={() => setReportModalOpen(false)}
          onSuccess={handleNewReportCreated}
        />
      )}

      {/* Modal de Coincidencias IA */}
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
