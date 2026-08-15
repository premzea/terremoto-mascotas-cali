"use client";

import { PetReport } from "@/lib/types";
import { MapPin, Calendar, MessageCircle, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";
import ContactGateModal from "./ContactGateModal";

interface PetCardProps {
  pet: PetReport;
}

export default function PetCard({ pet }: PetCardProps) {
  const [showGate, setShowGate] = useState<boolean>(false);

  const isLost = pet.report_type === "LOST";
  const badgeColor = isLost ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  const badgeText = isLost ? "PERDIDO / BUSCADO" : "ENCONTRADO / RESCATADO";

  return (
    <>
      <div className="edge-card p-4 flex flex-col sm:flex-row gap-4 hover:bg-neutral-900/60 transition">
        {/* Foto de borde a borde en móvil, thumbnail expandido */}
        <div className="w-full sm:w-44 h-52 sm:h-44 bg-neutral-900 relative rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800">
          <img
            src={pet.photo_url || "/placeholder-pet.png"}
            alt={pet.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                pet.species === "DOG" ? "/photos/Cartel Bonic Perro.jpeg" : "/photos/Cartel Dos Gatos Perdidos.jpeg";
            }}
          />
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor} backdrop-blur-md`}>
              {badgeText}
            </span>
          </div>
        </div>

        {/* Información Crítica */}
        <div className="flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-xl text-white tracking-tight leading-none">
                  {pet.name}
                </h3>
                <p className="text-xs font-semibold text-neutral-400 mt-1">
                  {pet.species === "DOG" ? "🐶 Perro" : pet.species === "CAT" ? "🐱 Gato" : "🐾 Mascota"} • {pet.gender} • {pet.primary_color}
                </p>
              </div>
              <span className="text-xs bg-neutral-800 text-neutral-300 font-mono px-2 py-1 rounded">
                ID: {pet.id}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mt-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{pet.neighborhood}</span>
            </div>

            {pet.distinctive_features && (
              <p className="text-xs text-neutral-300 mt-2 bg-neutral-900/70 p-2 rounded border border-neutral-800/80 leading-relaxed">
                <strong>Detalles:</strong> {pet.distinctive_features}
              </p>
            )}
          </div>

          {/* Botón de Contacto Protegido */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => setShowGate(true)}
              className={`flex-1 font-bold text-xs sm:text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
                isLost
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {isLost ? "¡Vi a esta mascota!" : "¡Es mi mascota!"}
            </button>
          </div>
        </div>
      </div>

      {showGate && <ContactGateModal pet={pet} onClose={() => setShowGate(false)} />}
    </>
  );
}
