"use client";

import { PetReport } from "@/lib/types";
import { findBestMatches, MatchResult } from "@/lib/matching-engine";
import { Sparkles, MapPin, X, ShieldCheck, CheckCircle2, Compass, ZoomIn } from "lucide-react";
import { useState } from "react";
import ContactGateModal from "./ContactGateModal";

interface MatchingModalProps {
  targetPet: PetReport;
  allPets: PetReport[];
  onClose: () => void;
}

export default function MatchingModal({ targetPet, allPets, onClose }: MatchingModalProps) {
  const [selectedMatch, setSelectedMatch] = useState<PetReport | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const matches: MatchResult[] = findBestMatches(targetPet, allPets, 5);

  const isLost = targetPet.report_type === "LOST";

  return (
    <>
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fade-in">
        <div className="bg-[#121215] border border-neutral-800 w-full max-w-3xl rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-800 bg-[#16161a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 text-amber-400 p-2.5 rounded-xl border border-amber-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-black text-lg sm:text-xl text-white flex items-center gap-2">
                  Motor de Coincidencias IA
                  <span className="text-[10px] bg-amber-500 font-bold px-2 py-0.5 rounded text-black uppercase">
                    50/50 DINOv2
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Buscando coincidencias para: <strong className="text-white">{targetPet.name}</strong> ({targetPet.species === "DOG" ? "Perro" : "Gato"})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de Referencia de la Mascota Objetivo */}
          <div className="p-4 bg-[#0e0e11] border-b border-neutral-800/80 flex items-center gap-3.5">
            <div
              onClick={() => setZoomedPhoto({ url: targetPet.photo_url || "/placeholder-pet.png", name: targetPet.name, id: targetPet.id })}
              className="w-16 h-16 rounded-lg bg-black border border-neutral-800 overflow-hidden flex-shrink-0 cursor-pointer relative group flex items-center justify-center p-1"
            >
              <img
                src={targetPet.photo_url || "/placeholder-pet.png"}
                alt={targetPet.name}
                className="w-full h-full object-contain group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Mascota a cotejar ({isLost ? "Buscada" : "Encontrada"})
              </span>
              <h4 className="font-bold text-sm text-white mt-1">
                {targetPet.name} — {targetPet.species === "DOG" ? "🐶 Perro" : "🐱 Gato"} ({targetPet.primary_color})
              </h4>
              <p className="text-neutral-400 mt-0.5">
                {isLost ? `📍 Última vez visto en: ${targetPet.neighborhood}` : "📍 Rescatado en Cali (Ubicación exacta protegida)"} • ID: {targetPet.id}
              </p>
            </div>
          </div>

          {/* Lista de Coincidencias */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-300">
                Top {matches.length} Coincidencias encontradas:
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">
                50% Rasgos Enums + 50% Visión DINOv2
              </span>
            </div>

            {matches.length > 0 ? (
              matches.map((m, index) => {
                const scoreColor =
                  m.score >= 80
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : m.score >= 60
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30";

                const isCandidateFound = m.pet.report_type === "FOUND" || m.pet.report_type === "SHELTERED";

                return (
                  <div
                    key={m.pet.id}
                    className="bg-[#18181c] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 hover:border-neutral-700 transition"
                  >
                    {/* Foto Candidato Ampliable */}
                    <div
                      onClick={() => setZoomedPhoto({ url: m.pet.photo_url || "/placeholder-pet.png", name: m.pet.name, id: m.pet.id })}
                      className="w-full sm:w-36 h-40 bg-black rounded-lg overflow-hidden border border-neutral-800 flex-shrink-0 flex items-center justify-center p-1 relative cursor-pointer group"
                    >
                      <img
                        src={m.pet.photo_url || "/placeholder-pet.png"}
                        alt={m.pet.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 border border-neutral-700 rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-bold text-neutral-300 group-hover:bg-amber-500 group-hover:text-black transition">
                        <ZoomIn className="w-3 h-3" />
                        <span>Ampliar</span>
                      </div>
                    </div>

                    {/* Detalles de la Coincidencia */}
                    <div className="flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-neutral-400">
                                #{index + 1}
                              </span>
                              <h3 className="font-extrabold text-lg text-white">
                                {m.pet.name}
                              </h3>
                              <span className="text-xs bg-neutral-800 text-neutral-300 font-mono px-1.5 py-0.5 rounded">
                                ID: {m.pet.id}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-neutral-400 mt-0.5">
                              {m.pet.species === "DOG" ? "Perro" : "Gato"} • {m.pet.primary_color} • {m.pet.gender}
                            </p>
                          </div>

                          {/* Badge de Score */}
                          <div className={`px-2.5 py-1 rounded-lg border font-black text-xs sm:text-sm ${scoreColor}`}>
                            {m.score}% Coincidencia
                          </div>
                        </div>

                        {/* Ubicación Protegida para Encontrados */}
                        <div className="flex items-center gap-2 text-xs font-semibold mt-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                          {isCandidateFound ? (
                            <span className="text-emerald-400">
                              Bajo resguardo en Cali (Ubicación exacta protegida por Triaje)
                            </span>
                          ) : (
                            <span className="text-amber-400">
                              {m.pet.neighborhood} (a ~{m.distanceKm} km)
                            </span>
                          )}
                        </div>

                        {/* Razones de Match */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {m.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-800 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              {r}
                            </span>
                          ))}
                        </div>

                        {/* Descripción */}
                        {m.pet.distinctive_features && (
                          <p className="text-xs text-neutral-400 mt-2 bg-[#121215] p-2 rounded border border-neutral-800 line-clamp-2">
                            {m.pet.distinctive_features}
                          </p>
                        )}
                      </div>

                      {/* Botón de Contactar Triaje */}
                      <div className="pt-2">
                        <button
                          onClick={() => setSelectedMatch(m.pet)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 transition"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Validar con Triaje Central
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-8 bg-neutral-900/40 rounded-xl border border-neutral-800 space-y-2">
                <Compass className="w-8 h-8 text-neutral-500 mx-auto" />
                <h4 className="font-bold text-white text-sm">No hay coincidencias directas aún</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  La red de voluntarios continuará procesando nuevos reportes en las próximas horas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Modal para Ampliar Foto */}
      {zoomedPhoto && (
        <div
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141417] border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-[#18181c]">
              <h4 className="font-extrabold text-sm text-white">
                {zoomedPhoto.name} — ID: {zoomedPhoto.id}
              </h4>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-black p-2 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden">
              <img
                src={zoomedPhoto.url}
                alt={zoomedPhoto.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Trigger para el Gate de Seguridad si el usuario elige validar */}
      {selectedMatch && (
        <ContactGateModal
          pet={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </>
  );
}
