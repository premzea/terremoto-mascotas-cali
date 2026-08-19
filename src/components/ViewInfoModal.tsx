"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import { KeyRound, Eye, Send, CheckCircle2, AlertCircle, Loader2, X, MapPin, Phone, User, MessageCircle, Shield } from "lucide-react";

interface ViewInfoModalProps {
  pet: PetReport;
  onClose: () => void;
}

export default function ViewInfoModal({ pet, onClose }: ViewInfoModalProps) {
  const [passcode, setPasscode] = useState<string>("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Request Info Fallback (No Code Mode)
  const [reason, setReason] = useState<string>("");
  const [requesterContact, setRequesterContact] = useState<string>("");
  const [sendingRequest, setSendingRequest] = useState<boolean>(false);
  const [requestSent, setRequestSent] = useState<boolean>(false);

  // 1. Verify Passcode via secure server route
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setPassError("Por favor ingresa el código de acceso.");
      return;
    }

    setVerifying(true);
    setPassError(null);

    try {
      const res = await fetch("/api/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.error || "Código maestro incorrecto. Acceso denegado.");
      }

      setIsUnlocked(true);
    } catch (err: any) {
      setPassError(err.message || "Código incorrecto.");
    } finally {
      setVerifying(false);
    }
  };

  // 2. Send Info Request Email (No Code Mode)
  const handleSendInfoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSendingRequest(true);
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INFO_REQUEST",
          data: {
            pet,
            requestReason: reason.trim(),
            requesterContact: requesterContact.trim(),
          },
        }),
      });

      setRequestSent(true);
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err) {
      console.error("Error sending info request email:", err);
    } finally {
      setSendingRequest(false);
    }
  };

  const isLost = pet.report_type === "LOST";

  return (
    <div className="fixed inset-0 bg-stone-900/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl p-5 sm:p-6 text-stone-900 max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition cursor-pointer"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-200 pb-3 mb-4">
          <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl border border-blue-300">
            <Eye className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Ver Información Completa</h3>
            <p className="text-xs text-stone-500">
              {pet.name} • ID: <span className="font-mono font-bold text-amber-800">{pet.id}</span> ({isLost ? "Perdida" : "Rescatada"})
            </p>
          </div>
        </div>

        {/* UNLOCKED MODE: Full Private Information View */}
        {isUnlocked ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Acceso maestro autorizado: Mostrando datos completos</span>
            </div>

            {/* Datos de Contacto y Teléfonos */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-stone-800 uppercase tracking-wider">
                <User className="w-4 h-4 text-blue-600" />
                <span>Contacto Responsable:</span>
              </div>

              <div className="space-y-1 text-xs">
                <p>
                  <strong>Nombre / Alias:</strong> {pet.contact_name || "No especificado"}
                </p>
                <p>
                  <strong>Teléfono / WhatsApp:</strong>{" "}
                  <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-300">
                    {pet.contact_phone || "No registrado"}
                  </span>
                </p>
              </div>

              {pet.contact_phone && (
                <a
                  href={`https://wa.me/57${pet.contact_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-4 rounded-xl shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir Chat de WhatsApp</span>
                </a>
              )}
            </div>

            {/* Ubicación y Coordenadas */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-black text-stone-800 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Ubicación y Barrio:</span>
              </div>
              <p>
                <strong>Barrio / Zona:</strong> {pet.neighborhood}
              </p>
              {pet.lat && pet.lng && (
                <p className="text-stone-600">
                  <strong>Coordenadas GPS:</strong> {pet.lat.toFixed(5)}, {pet.lng.toFixed(5)}
                  {" • "}
                  <a
                    href={`https://www.google.com/maps?q=${pet.lat},${pet.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Ver en Google Maps ↗
                  </a>
                </p>
              )}
            </div>

            {/* Rasgos y Descripción */}
            {pet.distinctive_features && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5 text-xs">
                <strong className="text-stone-800 block font-bold">Descripción Completa del Reporte:</strong>
                <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {pet.distinctive_features}
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-stone-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* LOCKED MODE: Enter Master Code OR Request Access */
          <div className="space-y-5">
            {/* Formulario de Código Maestro */}
            <form onSubmit={handleVerifyPasscode} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Ingresa el Código Maestro de administración:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Código de administración..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {passError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{passError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || !passcode.trim()}
                className="w-full bg-stone-900 hover:bg-black disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Ver Información con Código</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-semibold uppercase">
                O solicita acceso a este caso
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            {/* Cuadro de solicitud para ciudadanos sin código */}
            {requestSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5 animate-fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-xs text-emerald-900">¡Solicitud Enviada!</h4>
                <p className="text-[11px] text-emerald-700">
                  Nuestro equipo de triaje se comunicará contigo para verificar tu caso y facilitarte el contacto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInfoRequest} className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    ¿Necesitas la información de contacto o ubicación?
                  </h4>
                  <p className="text-[11px] text-blue-900 leading-snug">
                    Por seguridad y protección contra extorsiones, estos datos están reservados. Explícanos aquí por qué deseas acceder a este caso (ej. si reconoces a la mascota o eres el dueño/rescatista) y te responderemos de inmediato:
                  </p>
                </div>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Explica aquí el motivo de tu solicitud o cómo reconociste a la mascota..."
                  className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-500"
                />

                <div>
                  <input
                    type="text"
                    value={requesterContact}
                    onChange={(e) => setRequesterContact(e.target.value)}
                    required
                    placeholder="Tu nombre y teléfono / WhatsApp para contactarte *"
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingRequest || !reason.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Solicitar Información al Triaje</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
