"use client";

import { PetReport } from "@/lib/types";
import { findBestMatches, MatchResult } from "@/lib/matching-engine";
import { Sparkles, MapPin, X, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Compass } from "lucide-react";
import { useState } from "react";
import ContactGateModal from "./ContactGateModal";

interface MatchingModalProps {
  targetPet: PetReport;
  allPets: PetReport[];
  onClose: () => void;
}

export default function MatchingModal({ targetPet, allPets, onClose }: MatchingModalProps) {
  const [selectedMatch, setSelectedMatch] = useState<PetReport | null>(null);
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
                    Cali Match
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Buscando coincidencias para: <strong className="text-white">{targetPet.name}</strong> ({targetPet.neighborhood})
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
            <div className="w-16 h-16 rounded-lg bg-black border border-neutral-800 overflow-hidden flex-shrink-0">
              <img
                src={targetPet.photo_url || "/placeholder-pet.png"}
                alt={targetPet.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Mascota a cotejar ({isLost ? "Buscada" : "Encontrada"})
              </span>
              <h4 className="font-bold text-sm text-white mt-1">
                {targetPet.name} — {targetPet.species === "DOG" ? "🐶 Perro" : "🐱 Gato"} ({targetPet.primary_color})
              </h4>
              <p className="text-neutral-400 mt-0.5">
                📍 {targetPet.neighborhood} • ID: {targetPet.id}
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
                Similitud Visual + Proximidad GPS
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

                return (
                  <div
                    key={m.pet.id}
                    className="bg-[#18181c] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 hover:border-neutral-700 transition"
                  >
                    {/* Foto Candidato */}
                    <div className="w-full sm:w-36 h-40 bg-black rounded-lg overflow-hidden border border-neutral-800 flex-shrink-0 flex items-center justify-center p-1">
                      <img
                        src={m.pet.photo_url || "/placeholder-pet.png"}
                        alt={m.pet.name}
                        className="w-full h-full object-contain"
                      />
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

                        {/* Ubicación y Distancia */}
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mt-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {m.pet.neighborhood} (a ~{m.distanceKm} km)
                          </span>
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
