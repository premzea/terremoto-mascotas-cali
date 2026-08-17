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
      <div className="fixed inset-0 bg-stone-900/70 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-fade-in">
        <div className="bg-white border border-stone-200 w-full max-w-3xl rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-amber-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl border border-amber-300 shadow-2xs">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="font-black text-lg sm:text-xl text-stone-900 flex items-center gap-2">
                  Motor de Coincidencias IA
                  <span className="text-[10px] bg-amber-500 font-bold px-2 py-0.5 rounded-full text-white uppercase">
                    50/50 DINOv2
                  </span>
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Buscando coincidencias para: <strong className="text-stone-900">{targetPet.name}</strong> ({targetPet.species === "DOG" ? "Perro" : "Gato"})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de Referencia de la Mascota Objetivo */}
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center gap-3.5">
            <div
              onClick={() => setZoomedPhoto({ url: targetPet.photo_url || "/placeholder-pet.png", name: targetPet.name, id: targetPet.id || "N/A" })}
              className="w-16 h-16 rounded-xl bg-white border border-stone-200 overflow-hidden flex-shrink-0 cursor-pointer relative group flex items-center justify-center p-1 shadow-2xs"
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
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                Mascota a cotejar ({isLost ? "Buscada" : "Encontrada"})
              </span>
              <h4 className="font-bold text-sm text-stone-900 mt-1">
                {targetPet.name} — {targetPet.species === "DOG" ? "🐶 Perro" : "🐱 Gato"} ({targetPet.primary_color})
              </h4>
              <p className="text-stone-500 mt-0.5">
                {isLost ? `📍 Última vez visto en: ${targetPet.neighborhood}` : "📍 Rescatado en Cali (Ubicación protegida)"} • ID: {targetPet.id}
              </p>
            </div>
          </div>

          {/* Lista de Coincidencias */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAF8F5]">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-stone-700">
                Top {matches.length} Coincidencias encontradas:
              </span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                50% Rasgos Enums + 50% Visión DINOv2
              </span>
            </div>

            {matches.length > 0 ? (
              matches.map((m, index) => {
                const scoreColor =
                  m.score >= 80
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : m.score >= 60
                    ? "bg-amber-50 text-amber-900 border-amber-300"
                    : "bg-blue-50 text-blue-800 border-blue-200";

                const isCandidateFound = m.pet.report_type === "FOUND" || m.pet.report_type === "SHELTERED";

                return (
                  <div
                    key={m.pet.id}
                    className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 shadow-sm hover:shadow-md transition"
                  >
                    {/* Foto Candidato Ampliable */}
                    <div
                      onClick={() => setZoomedPhoto({ url: m.pet.photo_url || "/placeholder-pet.png", name: m.pet.name, id: m.pet.id || "N/A" })}
                      className="w-full sm:w-36 h-40 bg-stone-50 rounded-xl overflow-hidden border border-stone-200 flex-shrink-0 flex items-center justify-center p-1 relative cursor-pointer group"
                    >
                      <img
                        src={m.pet.photo_url || "/placeholder-pet.png"}
                        alt={m.pet.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition"
                      />
                      <div className="absolute bottom-2 right-2 bg-stone-900/80 border border-stone-700 rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-bold text-white group-hover:bg-amber-500 transition">
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
                              <span className="text-xs font-mono font-bold text-stone-500">
                                #{index + 1}
                              </span>
                              <h3 className="font-extrabold text-lg text-stone-900">
                                {m.pet.name}
                              </h3>
                              <span className="text-xs bg-stone-100 text-stone-700 font-mono px-1.5 py-0.5 rounded border border-stone-200">
                                ID: {m.pet.id}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">
                              {m.pet.species === "DOG" ? "Perro" : "Gato"} • {m.pet.primary_color} • {m.pet.gender}
                            </p>
                          </div>

                          {/* Badge de Score */}
                          <div className={`px-2.5 py-1 rounded-xl border font-black text-xs sm:text-sm ${scoreColor} shadow-2xs`}>
                            {m.score}% Coincidencia
                          </div>
                        </div>

                        {/* Ubicación Protegida para Encontrados */}
                        <div className="flex items-center gap-2 text-xs font-semibold mt-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                          {isCandidateFound ? (
                            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Bajo resguardo en Cali (Ubicación protegida)
                            </span>
                          ) : (
                            <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {m.pet.neighborhood} (a ~{m.distanceKm} km)
                            </span>
                          )}
                        </div>

                        {/* Razones de Match */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {m.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-stone-50 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200 flex items-center gap-1 font-medium"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              {r}
                            </span>
                          ))}
                        </div>

                        {/* Descripción */}
                        {m.pet.distinctive_features && sanitizeDescription(m.pet.distinctive_features) && (
                          <p className="text-xs text-stone-600 mt-2 bg-stone-50 p-2 rounded-xl border border-stone-200 line-clamp-2">
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
                          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
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
              <div className="text-center p-8 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-2">
                <Compass className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className="font-bold text-stone-900 text-sm">No hay coincidencias directas aún</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
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
          className="fixed inset-0 bg-stone-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h4 className="font-extrabold text-sm text-stone-900">
                {zoomedPhoto.name} — ID: {zoomedPhoto.id}
              </h4>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-1.5 hover:bg-stone-200 rounded-full text-stone-500 hover:text-stone-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-stone-100 p-2 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden">
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
        <div className="fixed inset-0 bg-stone-900/70 z-[60] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 text-stone-900 overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setSelectedMatch(null)}
              className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 absolute top-4 right-4 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {sendSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-black text-lg text-stone-900">¡Solicitud Enviada con Éxito!</h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                  Hemos notificado a la coordinación de triaje central y al equipo de rescate para conectar ambas partes de forma segura y verificada.
                </p>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendCommunicate} className="space-y-4">
                <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm border-b border-stone-200 pb-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>Conectar con {selectedMatch.pet.name} (ID: {selectedMatch.pet.id})</span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Envía un mensaje o tu teléfono de contacto. La coordinación de triaje intermediará la entrega de forma segura evitando fraudes y extorsiones.
                </p>

                {sendError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tu Teléfono o WhatsApp de Contacto:
                  </label>
                  <input
                    type="text"
                    required
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    placeholder="Ej: 315 123 4567 / Juan Pérez"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mensaje o Detalle sobre la Mascota:
                  </label>
                  <textarea
                    rows={3}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Ej: Creo que es mi perrito, tiene una cicatriz en la patita izquierda..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Enviar Solicitud</span>
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
