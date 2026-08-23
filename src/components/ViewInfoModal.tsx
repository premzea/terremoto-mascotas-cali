"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import {
  KeyRound,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  MapPin,
  Phone,
  User,
  MessageCircle,
  Shield,
  Home,
  Info,
  Calendar,
  Sparkles,
  Check,
  ExternalLink,
} from "lucide-react";
import { extractResguardoInfo } from "@/lib/sanitize";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";

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

  // Retrieve cached visual features if available
  const v2Cache = (visualFeaturesV2 as unknown) as Record<string, any>;
  const cachedV2 = v2Cache[pet.id || ""] || {};

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
  const resguardoLocation = extractResguardoInfo(pet.distinctive_features);

  // Phone parsing: check if phone is valid or NA
  const rawPhone = pet.contact_phone ? String(pet.contact_phone).trim() : "";
  const isPhoneNA =
    !rawPhone ||
    rawPhone.toUpperCase() === "NA" ||
    rawPhone.toUpperCase() === "N/A" ||
    rawPhone.toLowerCase() === "null" ||
    rawPhone.toLowerCase() === "undefined" ||
    rawPhone === "0";

  const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
  const hasValidPhoneDigits = cleanPhoneDigits.length >= 7;

  return (
    <div className="fixed inset-0 bg-stone-900/75 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-3xl p-5 sm:p-6 text-stone-900 max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition cursor-pointer"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-200 pb-3.5 mb-4">
          <div className="p-2.5 bg-blue-100 text-blue-800 rounded-2xl border border-blue-300 shadow-2xs">
            <Eye className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Ficha Técnica Completa</h3>
            <p className="text-xs text-stone-500">
              {pet.name} • ID: <span className="font-mono font-bold text-amber-800">{pet.id}</span> (
              {isLost ? "Mascota Buscada / Perdida" : "Mascota Rescatada / Encontrada"})
            </p>
          </div>
        </div>

        {/* UNLOCKED MODE: Full Complete Pet Information */}
        {isUnlocked ? (
          <div className="space-y-4 animate-fade-in text-xs">
            {/* Banner Acceso Autorizado */}
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 font-bold flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Acceso maestro autorizado — Mostrando todos los datos registrados</span>
              </div>
              <span className="bg-emerald-200/80 text-emerald-900 text-[10.5px] px-2 py-0.5 rounded-full font-mono">
                {pet.id}
              </span>
            </div>

            {/* 1. Tarjeta Resumen con Foto y Datos Generales */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-36 h-36 bg-white border border-stone-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center p-1 shadow-2xs">
                <img
                  src={pet.photo_url || "/placeholder-pet.png"}
                  alt={pet.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-black text-stone-900">{pet.name}</h4>
                    <span
                      className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full mt-0.5 border ${
                        isLost ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {isLost ? "Perdida / Buscada" : "Encontrada / Rescatada"}
                    </span>
                  </div>
                  <span className="text-stone-400 text-[11px] font-mono">
                    Estado: <strong className="text-stone-800">{pet.status || "ACTIVE"}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-stone-700">
                  <p>
                    <strong className="text-stone-900">Especie:</strong>{" "}
                    {pet.species === "DOG" ? "🐶 Perro" : pet.species === "CAT" ? "🐱 Gato" : "🐾 Mascota"}
                  </p>
                  <p>
                    <strong className="text-stone-900">Sexo:</strong> {pet.gender || "No definido"}
                  </p>
                  <p>
                    <strong className="text-stone-900">Tamaño:</strong> {pet.size || "MEDIANO"}
                  </p>
                  <p>
                    <strong className="text-stone-900">Color principal:</strong> {pet.primary_color || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Rasgos Visuales y Morfología */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5">
              <h5 className="font-extrabold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200 pb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Características Visuales Registradas:</span>
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-stone-700">
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold block">Colores</span>
                  <strong className="text-stone-900 block">{pet.primary_color || "N/A"}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold block">Orejas</span>
                  <strong className="text-stone-900 block">{cachedV2.ear_type || "No especificado"}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold block">Ojos</span>
                  <strong className="text-stone-900 block">{cachedV2.eye_color || "No especificado"}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold block">Nariz / Trufa</span>
                  <strong className="text-stone-900 block">{cachedV2.nose_color || "No especificado"}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold block">Patrón</span>
                  <strong className="text-stone-900 block">{pet.pattern || cachedV2.coat_pattern || "Estándar"}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold block">Largo de Pelo</span>
                  <strong className="text-stone-900 block">{cachedV2.fur_length || "Estándar"}</strong>
                </div>
              </div>
            </div>

            {/* 3. Lugar de Resguardo / Custodia (Privado) */}
            {resguardoLocation && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs uppercase tracking-wider">
                  <Home className="w-4 h-4 text-amber-700" />
                  <span>Lugar de Resguardo / Custodia / Hogar de Paso:</span>
                </div>
                <p className="text-amber-900 font-bold text-sm">{resguardoLocation}</p>
                <span className="text-[10.5px] text-amber-800 block">
                  🔒 Información protegida para seguridad del albergue y evitar cobros extorsivos.
                </span>
              </div>
            )}

            {/* 4. Ubicación y Coordenadas */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-black text-stone-800 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Ubicación de {isLost ? "Pérdida" : "Hallazgo"}:</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-stone-200">
                <div>
                  <strong className="text-stone-900 font-bold block">{pet.neighborhood}</strong>
                  {pet.lat && pet.lng ? (
                    <span className="text-stone-500 text-[11px]">
                      GPS: {pet.lat.toFixed(5)}, {pet.lng.toFixed(5)}
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px]">Coordenadas GPS no especificadas</span>
                  )}
                </div>
                {pet.lat && pet.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${pet.lat},${pet.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs"
                  >
                    <span>Abrir en Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* 5. Contacto Responsable (Unmasked) */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 font-black text-stone-800 uppercase tracking-wider">
                <User className="w-4 h-4 text-blue-600" />
                <span>Contacto Responsable del Reporte:</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
                <p>
                  <strong className="text-stone-900">Nombre / Contactos:</strong>{" "}
                  <span className="text-stone-800 font-semibold">{pet.contact_name || "No especificado"}</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-stone-900">Teléfono / WhatsApp:</strong>
                  {isPhoneNA ? (
                    <span className="font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      NA
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300 text-xs">
                      {rawPhone}
                    </span>
                  )}
                </div>

                {hasValidPhoneDigits && !isPhoneNA && (
                  <a
                    href={`https://wa.me/57${cleanPhoneDigits.slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-4 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Abrir Chat de WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* 6. Descripción y Rasgos Particulares */}
            {pet.distinctive_features && (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-1.5">
                <strong className="text-stone-900 block font-bold uppercase tracking-wider text-[11px]">
                  Descripción y Notas del Registro:
                </strong>
                <p className="text-stone-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
                  {pet.distinctive_features}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-stone-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-md"
            >
              Cerrar Ficha
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
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-blue-500 shadow-2xs"
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
                className="w-full bg-stone-900 hover:bg-black disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
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
