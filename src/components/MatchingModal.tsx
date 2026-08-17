"use client";

import { PetReport } from "@/lib/types";
import { findBestMatches, MatchResult } from "@/lib/matching-engine";
import { Sparkles, MapPin, X, Send, CheckCircle2, Compass, ZoomIn, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { sanitizeDescription } from "@/lib/sanitize";

interface MatchingModalProps {
  targetPet: PetReport;
  allPets: PetReport[];
  onClose: () => void;
}

export default function MatchingModal({ targetPet, allPets, onClose }: MatchingModalProps) {
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const [userNote, setUserNote] = useState<string>("");
  const [senderContact, setSenderContact] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const matches: MatchResult[] = findBestMatches(targetPet, allPets, 5);
  const isLost = targetPet.report_type === "LOST";

  const handleSendCommunicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MATCH_CONTACT",
          data: {
            targetPet,
            candidatePet: selectedMatch.pet,
            score: selectedMatch.score,
            reasons: selectedMatch.reasons,
            userMessage: `Contacto: ${senderContact || "No especificado"} | Nota: ${userNote || "Solicitud de conexión directa"}`,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar la notificación");
      }

      setSendSuccess(true);
    } catch (err: any) {
      setSendError(err.message || "Error al enviar la solicitud.");
    } finally {
      setSending(false);
    }
  };

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
              onClick={() => setZoomedPhoto({ url: targetPet.photo_url || "/placeholder-pet.png", name: targetPet.name, id: targetPet.id || "N/A" })}
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
                      onClick={() => setZoomedPhoto({ url: m.pet.photo_url || "/placeholder-pet.png", name: m.pet.name, id: m.pet.id || "N/A" })}
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
                        {m.pet.distinctive_features && sanitizeDescription(m.pet.distinctive_features) && (
                          <p className="text-xs text-neutral-400 mt-2 bg-[#121215] p-2 rounded border border-neutral-800 line-clamp-2">
                            {sanitizeDescription(m.pet.distinctive_features)}
                          </p>
                        )}
                      </div>

                      {/* Botón Comunícate! */}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setSelectedMatch(m);
                            setUserNote("");
                            setSenderContact("");
                            setSendSuccess(false);
                            setSendError(null);
                          }}
                          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition hover:scale-[1.02]"
                        >
                          <Send className="w-4 h-4" />
                          <span>¡Comunícate!</span>
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

      {/* Modal Comunícate! para Enviar Notificación al Correo */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#141417] border border-neutral-800 rounded-2xl max-w-lg w-full p-6 text-white overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-4">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">¡Conectar Mascotas!</h3>
                <p className="text-xs text-neutral-400">Notificación directa al equipo de Búsqueda Animal Cali</p>
              </div>
            </div>

            {sendSuccess ? (
              <div className="text-center py-6 space-y-3 animate-fade-in">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-white">¡Notificación Enviada!</h4>
                <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                  Se ha enviado un correo a <strong className="text-amber-400">busquedanimalcali@gmail.com</strong> con los detalles de <strong>{targetPet.name}</strong> y <strong>{selectedMatch.pet.name}</strong> para coordinar el contacto.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendCommunicate} className="space-y-4">
                {sendError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-neutral-300 font-bold border-b border-neutral-800 pb-2">
                    <span>Mascota 1: {targetPet.name} ({targetPet.id})</span>
                    <span className="text-emerald-400">{selectedMatch.score}% Match</span>
                  </div>
                  <div className="text-neutral-400">
                    <span>Mascota 2: {selectedMatch.pet.name} ({selectedMatch.pet.id})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Tu Teléfono o WhatsApp de Contacto:
                  </label>
                  <input
                    type="tel"
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    placeholder="Ej: 315 123 4567"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Mensaje o Información Adicional (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Ej: Creo que esta es mi mascota encontrada, reconozco la mancha..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="w-1/3 bg-neutral-800 hover:bg-neutral-700 font-bold py-3 rounded-xl text-xs text-neutral-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Enviar a Triaje Central</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
