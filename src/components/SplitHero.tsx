"use client";

import { PlusCircle, AlertTriangle, HeartHandshake } from "lucide-react";

interface SplitHeroProps {
  onOpenReport: (type: "LOST" | "FOUND") => void;
  activeFilter: string;
  onFilterChange: (type: string) => void;
}

export default function SplitHero({ onOpenReport, activeFilter, onFilterChange }: SplitHeroProps) {
  return (
    <div className="w-full bg-white border-b border-stone-200 shadow-sm">
      {/* 50/50 Split Grid de Acción Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
        {/* Mitad 1: ¿Perdiste tu mascota? */}
        <div className="p-5 sm:p-6 flex flex-col justify-between space-y-3.5 bg-gradient-to-br from-orange-50/90 via-amber-50/40 to-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200/80">
                Urgencia / Familias
              </span>
              <h2 className="text-xl font-black text-stone-900 mt-1.5">¿Perdiste a tu mascota?</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Sube su foto y detalles para cruzarla de inmediato con los 135+ animales encontrados y rescatados en Cali.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100/80 border border-orange-200 flex items-center justify-center flex-shrink-0 ml-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenReport("LOST")}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" /> Reportar Pérdida
            </button>
            <button
              onClick={() => onFilterChange("FOUND")}
              className={`px-3 py-3 rounded-xl text-xs font-bold border transition ${
                activeFilter === "FOUND"
                  ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                  : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              Ver Encontrados
            </button>
          </div>
        </div>

        {/* Mitad 2: ¿Encontraste una mascota? */}
        <div className="p-5 sm:p-6 flex flex-col justify-between space-y-3.5 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200/80">
                Rescatistas / Voluntarios
              </span>
              <h2 className="text-xl font-black text-stone-900 mt-1.5">¿Encontraste o resguardaste una?</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Tómale una foto rápida en la calle o albergue para avisar a su dueño antes de que caiga la noche.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center flex-shrink-0 ml-3">
              <HeartHandshake className="w-5 h-5 text-emerald-600" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenReport("FOUND")}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" /> Reportar Encontrada
            </button>
            <button
              onClick={() => onFilterChange("LOST")}
              className={`px-3 py-3 rounded-xl text-xs font-bold border transition ${
                activeFilter === "LOST"
                  ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                  : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
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
