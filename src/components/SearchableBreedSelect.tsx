"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X, Sparkles } from "lucide-react";
import breedsData from "@/data/breeds.json";

interface SearchableBreedSelectProps {
  species: "DOG" | "CAT" | "OTHER";
  value: string;
  onChange: (breed: string) => void;
}

function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function SearchableBreedSelect({
  species,
  value,
  onChange,
}: SearchableBreedSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Available breeds for current species
  const breedList = useMemo(() => {
    if (species === "CAT") return breedsData.catBreeds;
    if (species === "DOG") return breedsData.dogBreeds;
    return [...breedsData.dogBreeds, ...breedsData.catBreeds];
  }, [species]);

  // Quick popular chips based on species
  const quickChips = useMemo(() => {
    if (species === "CAT") {
      return ["Criollo / Mestizo", "Siamés", "Persa", "Carey", "Calicó", "Atigrado / Tabby", "Angora"];
    }
    return [
      "Criollo / Mestizo",
      "Pastor Alemán",
      "Pastor Holandés",
      "Pitbull",
      "Poodle / Caniche",
      "Labrador",
      "Pinscher Miniatura",
      "Schnauzer",
    ];
  }, [species]);

  // Filtered list based on search query
  const filteredBreeds = useMemo(() => {
    if (!searchQuery.trim()) return breedList;
    const q = normalizeText(searchQuery);
    return breedList.filter((b) => normalizeText(b).includes(q));
  }, [searchQuery, breedList]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectBreed = (selected: string) => {
    onChange(selected);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-900 block">
          Raza de la Mascota ({species === "CAT" ? "Gato" : species === "DOG" ? "Perro" : "Animal"}) *
        </label>
        {value && (
          <span className="text-[10.5px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            ✓ Seleccionada
          </span>
        )}
      </div>

      {/* Selected Box View */}
      {value ? (
        <div className="bg-amber-50/80 border border-amber-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-sm">{species === "CAT" ? "🐱" : "🐶"}</span>
            <div>
              <strong className="text-stone-900 text-xs block font-bold">{value}</strong>
              <span className="text-[10px] text-stone-500">Raza registrada para cotejo inteligente</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition"
            title="Cambiar raza"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={
              species === "CAT"
                ? "Buscar raza de gato (ej: Siamés, Criollo, Persa, Carey...)"
                : "Buscar raza de perro (ej: Pastor Holandés, Criollo, Pitbull, Labrador...)"
            }
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 p-0.5 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-stone-100 animate-fade-in">
              {filteredBreeds.length > 0 ? (
                filteredBreeds.map((breed) => (
                  <button
                    key={breed}
                    type="button"
                    onClick={() => handleSelectBreed(breed)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-amber-50 hover:text-amber-950 transition flex items-center justify-between group"
                  >
                    <span className="text-stone-800 font-medium group-hover:font-bold">{breed}</span>
                    <Check className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))
              ) : (
                <div className="p-3 text-center">
                  <p className="text-xs text-stone-600 mb-1">
                    No encontramos <strong>"{searchQuery}"</strong> en la lista estándar.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectBreed(searchQuery.trim())}
                    className="mt-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg border border-amber-300 transition w-full"
                  >
                    + Registrar como "{searchQuery.trim()}"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Chips (filtered by current species) */}
      {!value && (
        <div className="space-y-1 pt-0.5">
          <span className="text-[10px] text-stone-500 font-medium block">
            Sugerencias frecuentes de {species === "CAT" ? "gatos" : "perros"}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSelectBreed(chip)}
                className="text-[10.5px] bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-stone-200 hover:border-amber-300 transition font-medium cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
