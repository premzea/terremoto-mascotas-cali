"use client";

import { PetReport } from "@/lib/types";
import { MapPin, MessageCircle, Maximize2, X, ZoomIn } from "lucide-react";
import { useState } from "react";
import ContactGateModal from "./ContactGateModal";

interface PetCardProps {
  pet: PetReport;
}

export default function PetCard({ pet }: PetCardProps) {
  const [showGate, setShowGate] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);

  const isLost = pet.report_type === "LOST";
  const badgeColor = isLost ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  const badgeText = isLost ? "PERDIDO / BUSCADO" : "ENCONTRADO / RESCATADO";

  const fallbackPhoto = pet.species === "DOG" ? "/photos/Cartel Bonic Perro.jpeg" : "/photos/Cartel Dos Gatos Perdidos.jpeg";

  return (
    <>
      <div className="edge-card p-4 flex flex-col sm:flex-row gap-4 hover:bg-neutral-900/60 transition">
        {/* Foto completa visible sin cortes (object-contain) y clickeable para ampliar */}
        <div
          onClick={() => setShowPhotoModal(true)}
          className="w-full sm:w-48 h-56 sm:h-44 bg-[#0a0a0c] relative rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800 cursor-pointer group flex items-center justify-center p-1"
        >
          <img
            src={pet.photo_url || "/placeholder-pet.png"}
            alt={pet.name}
            className="w-full h-full object-contain transition group-hover:scale-[1.02]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackPhoto;
            }}
          />

          {/* Badge Tipo */}
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor} backdrop-blur-md`}>
              {badgeText}
            </span>
          </div>

          {/* Overlay sutil para indicar que se puede ampliar */}
          <div className="absolute bottom-2 right-2 bg-black/75 border border-neutral-700/80 rounded-md px-2 py-1 flex items-center gap-1 text-[10px] font-bold text-neutral-200 group-hover:bg-amber-500 group-hover:text-black transition shadow-md">
            <ZoomIn className="w-3 h-3" />
            <span>Ampliar</span>
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

      {/* Modal de Foto Completa (Lightbox) */}
      {showPhotoModal && (
        <div
          onClick={() => setShowPhotoModal(false)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141417] border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header del Modal */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#18181c]">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  {pet.name}
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                    {badgeText}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  {pet.neighborhood} • ID: {pet.id}
                </p>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenedor de la Imagen Completa */}
            <div className="flex-1 bg-black p-2 sm:p-4 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden">
              <img
                src={pet.photo_url || fallbackPhoto}
                alt={pet.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackPhoto;
                }}
              />
            </div>

            {/* Footer con Acciones */}
            <div className="p-4 border-t border-neutral-800 flex items-center justify-between gap-3 bg-[#18181c]">
              <p className="text-xs text-neutral-400 line-clamp-1 flex-1">
                {pet.distinctive_features || `${pet.primary_color} • ${pet.species}`}
              </p>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setShowGate(true);
                }}
                className={`font-bold text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 ${
                  isLost
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                {isLost ? "Reportar Avistamiento" : "Contactar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gate Fotográfico */}
      {showGate && <ContactGateModal pet={pet} onClose={() => setShowGate(false)} />}
    </>
  );
}
