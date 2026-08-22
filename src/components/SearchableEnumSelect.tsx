"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface EnumOption {
  id: string;
  label: string;
  icon?: string;
}

interface SearchableEnumSelectProps {
  label: string;
  icon?: React.ReactNode;
  options: EnumOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function SearchableEnumSelect({
  label,
  icon,
  options,
  value,
  onChange,
  placeholder = "Buscar opción...",
}: SearchableEnumSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  // Filter options based on user typing
  const filteredOptions = options.filter((o) => {
    if (!query.trim()) return true;
    const q = normalize(query);
    return normalize(o.label).includes(q) || normalize(o.id).includes(q);
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-1">
      <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </label>

      <div
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        className={`w-full bg-white border rounded-xl px-2.5 py-2 text-xs flex items-center justify-between cursor-pointer transition shadow-2xs ${
          isOpen ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"
        }`}
      >
        <span className="font-semibold text-stone-800 truncate">
          {selectedOption ? (
            <span>
              {selectedOption.icon && <span className="mr-1.5">{selectedOption.icon}</span>}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-stone-400 font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? "rotate-180 text-amber-600" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in max-h-52 flex flex-col">
          {/* Searchbar inside dropdown */}
          <div className="p-1.5 border-b border-stone-100 bg-stone-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe para buscar opciones..."
                className="w-full bg-white border border-stone-200 rounded-lg pl-8 pr-6 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto divide-y divide-stone-50 flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-50 text-amber-900 font-extrabold"
                        : "text-stone-700 hover:bg-stone-100 font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {opt.icon && <span>{opt.icon}</span>}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 ml-1" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-[11px] text-stone-400">
                No hay coincidencias para &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
