"use client";

import { PetReport } from "@/lib/types";
import { MapPin, MessageCircle, ZoomIn, Info, Sparkles, Shield, CheckCircle } from "lucide-react";
import { useState } from "react";
import ContactGateModal from "./ContactGateModal";
import CloseCaseModal from "./CloseCaseModal";
import { sanitizeDescription } from "@/lib/sanitize";

interface PetCardProps {
  pet: PetReport;
  onFindMatches?: (pet: PetReport) => void;
  onCloseCase?: (petId: string) => void;
}

export default function PetCard({ pet, onFindMatches, onCloseCase }: PetCardProps) {
  const [showGate, setShowGate] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);

  const isLost = pet.report_type === "LOST";
  const badgeColor = isLost
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const badgeText = isLost ? "PERDIDO / BUSCADO" : "ENCONTRADO / RESCATADO";

  const fallbackPhoto = "/placeholder-pet.png";

  return (
    <>
      <div className="edge-card bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 shadow-sm hover:shadow-md transition">
        {/* Foto completa visible sin cortes (object-contain) y clickeable para ampliar */}
        <div
          onClick={() => setShowPhotoModal(true)}
          className="w-full sm:w-52 h-60 sm:h-52 bg-stone-50 relative rounded-xl overflow-hidden flex-shrink-0 border border-stone-200/80 cursor-pointer group flex items-center justify-center p-1.5"
        >
          <img
            src={pet.photo_url || "/placeholder-pet.png"}
            alt={pet.name}
            className="w-full h-full object-contain transition duration-200 group-hover:scale-[1.02]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackPhoto;
            }}
          />

          {/* Badge Tipo */}
          <div className="absolute top-2.5 left-2.5 pointer-events-none">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor} backdrop-blur-md shadow-sm`}>
              {badgeText}
            </span>
          </div>

          {/* Overlay sutil para indicar que se puede ampliar */}
          <div className="absolute bottom-2.5 right-2.5 bg-stone-900/80 hover:bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold text-white transition shadow-sm">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Ver foto</span>
          </div>
        </div>

        {/* Información Crítica & Descripción Completa */}
        <div className="flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            {/* Título y Código */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-black text-xl sm:text-2xl text-stone-900 tracking-tight leading-none">
                  {pet.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-600 mt-1.5">
                  <span className="text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md font-bold">
                    {pet.species === "DOG" ? "🐶 Perro" : pet.species === "CAT" ? "🐱 Gato" : "🐾 Mascota"}
                  </span>
                  <span>•</span>
                  <span>{pet.gender}</span>
                  {pet.size && pet.size !== "MEDIANO" && (
                    <>
                      <span>•</span>
                      <span className="text-stone-700">Tamaño: {pet.size}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-stone-100 text-stone-700 font-mono font-bold px-2.5 py-1 rounded-md border border-stone-200">
                  {pet.id}
                </span>
                <button
                  onClick={() => setShowCloseModal(true)}
                  title="Cerrar reporte / Marcar como reunido"
                  className="text-[11px] bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200 hover:border-emerald-300 px-2 py-1 rounded-md flex items-center gap-1 transition font-bold"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              </div>
            </div>

            {/* Ubicación: Protegida para rescatados contra extorsiones / Abierta para perdidos */}
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border w-fit">
              {isLost ? (
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50/80 border-amber-200/60">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                  <span>Visto por última vez en: <strong>{pet.neighborhood}</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50/80 border-emerald-200/60">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                  <span>En resguardo en Cali (Ubicación protegida por Triaje)</span>
                </div>
              )}
            </div>

            {/* Descripción Completa */}
            {pet.distinctive_features && sanitizeDescription(pet.distinctive_features) && (
              <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200/80 leading-relaxed space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
                  <Info className="w-3 h-3 text-amber-600" />
                  <span>Descripción y Rasgos:</span>
                </div>
                <p className="text-stone-800 font-normal">
                  {sanitizeDescription(pet.distinctive_features)}
                </p>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="pt-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
            {onFindMatches && (
              <button
                onClick={() => onFindMatches(pet)}
                className="bg-amber-100/70 hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Coincidencias IA</span>
              </button>
            )}

            <button
              onClick={() => setShowGate(true)}
              className={`flex-1 font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                isLost
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-md shadow-orange-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20"
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
          className="fixed inset-0 bg-stone-900/75 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                  {pet.name}
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {badgeText}
                  </span>
                </h3>
                <p className="text-xs text-stone-500">
                  {isLost ? `Visto en ${pet.neighborhood}` : "Resguardado en Cali"} • ID: {pet.id}
                </p>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-2 hover:bg-stone-200 rounded-full text-stone-500 hover:text-stone-900 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-stone-100 p-2 sm:p-4 flex items-center justify-center min-h-[300px] max-h-[65vh] overflow-hidden">
              <img
                src={pet.photo_url || fallbackPhoto}
                alt={pet.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackPhoto;
                }}
              />
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
              {pet.distinctive_features && sanitizeDescription(pet.distinctive_features) && (
                <div className="text-xs text-stone-700 bg-white p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                  <strong className="text-amber-800">Descripción:</strong> {sanitizeDescription(pet.distinctive_features)}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {onFindMatches && (
                  <button
                    onClick={() => {
                      setShowPhotoModal(false);
                      onFindMatches(pet);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold text-xs py-3 px-4 rounded-xl flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Buscar Coincidencias IA
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowPhotoModal(false);
                    setShowGate(true);
                  }}
                  className={`font-extrabold text-xs py-3 px-5 rounded-xl text-white flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md ${
                    isLost
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-orange-500/20"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isLost ? "¡Vi a esta mascota!" : "¡Es mi mascota!"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Protección de Triaje y Validación Anti-Extorsión */}
      {showGate && <ContactGateModal pet={pet} onClose={() => setShowGate(false)} />}

      {/* Modal de Cierre de Caso con Código Maestro */}
      {showCloseModal && (
        <CloseCaseModal
          pet={pet}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false);
            if (onCloseCase && pet.id) onCloseCase(pet.id);
          }}
        />
      )}
    </>
  );
}
