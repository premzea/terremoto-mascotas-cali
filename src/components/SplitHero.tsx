"use client";

import { Search, PlusCircle, AlertTriangle, HeartHandshake } from "lucide-react";

interface SplitHeroProps {
  onOpenReport: (type: "LOST" | "FOUND") => void;
  activeFilter: string;
  onFilterChange: (type: string) => void;
}

export default function SplitHero({ onOpenReport, activeFilter, onFilterChange }: SplitHeroProps) {
  return (
    <div className="w-full bg-[#111113] border-b border-neutral-800">
      {/* 50/50 Split Grid de Acción Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800">
        {/* Mitad 1: ¿Perdiste tu mascota? */}
        <div className="p-5 flex flex-col justify-between space-y-3 bg-gradient-to-br from-red-950/30 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/50">
                Urgencia / Familias
              </span>
              <h2 className="text-xl font-black text-white mt-1">¿Perdiste a tu mascota?</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Sube su foto y detalles para cruzarla de inmediato con los 135+ animales encontrados y rescatados en Cali.
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenReport("LOST")}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/50"
            >
              <PlusCircle className="w-4 h-4" /> Reportar Pérdida
            </button>
            <button
              onClick={() => onFilterChange("FOUND")}
              className={`px-3 py-3 rounded-xl text-xs font-bold border ${
                activeFilter === "FOUND"
                  ? "bg-neutral-800 border-neutral-600 text-white"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400"
              }`}
            >
              Ver Encontrados
            </button>
          </div>
        </div>

        {/* Mitad 2: ¿Encontraste una mascota? */}
        <div className="p-5 flex flex-col justify-between space-y-3 bg-gradient-to-br from-emerald-950/30 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                Rescatistas / Voluntarios
              </span>
              <h2 className="text-xl font-black text-white mt-1">¿Encontraste o resguardaste una?</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Tómale una foto rápida en la calle o albergue para avisar a su dueño antes de que caiga la noche.
              </p>
            </div>
            <HeartHandshake className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenReport("FOUND")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
            >
              <PlusCircle className="w-4 h-4" /> Reportar Hallazgo
            </button>
            <button
              onClick={() => onFilterChange("LOST")}
              className={`px-3 py-3 rounded-xl text-xs font-bold border ${
                activeFilter === "LOST"
                  ? "bg-neutral-800 border-neutral-600 text-white"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400"
              }`}
            >
              Ver Buscados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
