"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import { CENTRAL_TRIAGE_WHATSAPP } from "@/lib/data-service";
import { ShieldCheck, Camera, X, Check, Lock, Heart, Eye, User, Phone, MapPin, FileText } from "lucide-react";

interface ContactGateModalProps {
  pet: PetReport;
  onClose: () => void;
}

export default function ContactGateModal({ pet, onClose }: ContactGateModalProps) {
  const isLost = pet.report_type === "LOST";

  // Form State
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [evidenceNotes, setEvidenceNotes] = useState<string>("");
  const [sightingLocation, setSightingLocation] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const getWhatsAppLink = () => {
    if (!isLost) {
      // Flujo: EL DUEÑO RECLAMA SU MASCOTA RESCATADA (FOUND)
      const text = encodeURIComponent(
        `🚨 *SOLICITUD DE REENCUENTRO - RECLAMO DE MASCOTA RESCATADA*\n\n` +
        `📋 *ID de Rescate:* ${pet.id}\n` +
        `🐾 *Mascota:* ${pet.name} (${pet.species === "DOG" ? "Perro" : pet.species === "CAT" ? "Gato" : "Animal"})\n` +
        `📍 *Zona donde fue hallado:* ${pet.neighborhood}\n\n` +
        `👤 *Dueño/a que reclama:* ${name.trim() || "Propietario"}\n` +
        `📱 *Teléfono de contacto:* ${phone.trim() || "Por verificar"}\n` +
        `📝 *Pruebas / Rasgos particulares:* ${evidenceNotes.trim() || "Tengo fotos familiares previas y carné de vacunas."}\n\n` +
        `_Hola equipo de Triaje Central de Emergencia, adjunto por este chat las fotos previas / documentos para verificar que es mi mascota y coordinar la entrega._`
      );
      return `https://wa.me/${CENTRAL_TRIAGE_WHATSAPP}?text=${text}`;
    } else {
      // Flujo: UN CIUDADANO REPORTA AVISTAMIENTO DE UNA MASCOTA PERDIDA (LOST)
      const text = encodeURIComponent(
        `🚨 *REPORTE DE AVISTAMIENTO DE MASCOTA BUSCADA*\n\n` +
        `📋 *ID de Búsqueda:* ${pet.id}\n` +
        `🐾 *Mascota perdida:* ${pet.name} (${pet.species === "DOG" ? "Perro" : pet.species === "CAT" ? "Gato" : "Animal"})\n` +
        `📍 *Barrio donde se perdió:* ${pet.neighborhood}\n\n` +
        `👤 *Informante:* ${name.trim() || "Ciudadano informante"}\n` +
        `📱 *Teléfono:* ${phone.trim() || "Por verificar"}\n` +
        `📍 *¿Dónde la viste?:* ${sightingLocation.trim() || "En la zona"}\n` +
        `📝 *Detalles / Estado:* ${evidenceNotes.trim() || "La vi recientemente."}\n\n` +
        `_Hola equipo de Triaje Central, por favor compartan este reporte con la familia de ${pet.name}._`
      );
      return `https://wa.me/${CENTRAL_TRIAGE_WHATSAPP}?text=${text}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-stone-900 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl border ${
              isLost
                ? "bg-orange-100 text-orange-800 border-orange-200"
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}>
              {isLost ? <Eye className="w-5 h-5 text-orange-600" /> : <Heart className="w-5 h-5 text-emerald-600" />}
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900 leading-tight">
                {isLost ? "Reportar Avistamiento" : "¡Es Mi Mascota! Reclamar Reencuentro"}
              </h3>
              <p className="text-[11px] text-stone-500">
                {isLost
                  ? "Conecta con la familia que busca a este animal"
                  : "Canal seguro y protegido para entrega a su dueño legítimo"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la Mascota */}
        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-1 mb-4 flex items-center gap-3">
          <img
            src={pet.photo_url || "/placeholder-pet.png"}
            alt={pet.name}
            className="w-14 h-14 object-cover rounded-xl border border-stone-300 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-stone-900 truncate">
                {pet.name}
              </span>
              <span className="text-[10px] font-mono font-bold bg-stone-200/80 px-1.5 py-0.5 rounded text-stone-700">
                {pet.id}
              </span>
            </div>
            <p className="text-[11px] text-stone-600 truncate mt-0.5">
              {pet.species === "DOG" ? "🐶 Perro" : pet.species === "CAT" ? "🐱 Gato" : "🐾 Mascota"} • {pet.primary_color} • {isLost ? `Perdido en ${pet.neighborhood}` : `Rescatado en ${pet.neighborhood}`}
            </p>
          </div>
        </div>

        {/* Formulario Especializado por Rol */}
        {!isLost ? (
          /* ========================================================================= */
          /* CASO 1: EL USUARIO ESTÁ RECLAMANDO A SU MASCOTA ENCONTRADA / RESCATADA    */
          /* ========================================================================= */
          <div className="space-y-3.5">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <strong className="font-bold flex items-center gap-1 text-emerald-950">
                <Lock className="w-3.5 h-3.5 text-emerald-700" /> Protocolo de Protección Anti-Extorsión:
              </strong>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Para proteger al animal de robos y reclamaciones falsas, el equipo de Triaje Central valida la identidad del dueño antes de dar la ubicación de entrega.
              </p>
            </div>

            {/* Datos del Dueño */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Tu Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Laura Morales"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Tu Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 315 123 4567"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Pruebas de propiedad o rasgos secretos */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Rasgos particulares o señas secretas de tu mascota:
              </label>
              <textarea
                rows={2}
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Ej: Tiene una mancha blanca oculta en el pecho, responde al nombre de 'Max', cicatriz en oreja izquierda..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:bg-white focus:border-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Foto previa con la familia / Carné */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Foto previa con la familia o carné de vacunas (Opcional):
              </label>
              <label className="border border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition">
                {photoPreview ? (
                  <img src={photoPreview} alt="Prueba" className="w-12 h-12 object-cover rounded-lg border border-emerald-300" />
                ) : (
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Camera className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 text-xs">
                  <span className="font-bold text-stone-900 block">
                    {photoPreview ? "✓ Foto adjunta seleccionada" : "Subir foto antigua de la mascota"}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Ayuda al equipo de rescate a confirmar que eres el dueño legítimo
                  </span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            {/* Botón WhatsApp Triaje */}
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-xs sm:text-sm transition active:scale-[0.98] cursor-pointer mt-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Contactar a Triaje Central para Reclamar</span>
            </a>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASO 2: EL USUARIO VIO / RESCATÓ A UNA MASCOTA QUE ESTÁ PERDIDA (LOST)    */
          /* ========================================================================= */
          <div className="space-y-3.5">
            <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl text-xs text-orange-900 space-y-1">
              <strong className="font-bold flex items-center gap-1 text-orange-950">
                <Eye className="w-3.5 h-3.5 text-orange-700" /> Reportar que viste o resguardaste a este animal:
              </strong>
              <p className="text-[11px] text-orange-800 leading-snug">
                Tu reporte será verificado de inmediato por el equipo voluntario para contactar a la familia angustiada.
              </p>
            </div>

            {/* Datos del Informante */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Tu Nombre o Apodo *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Vecino / Rescatista Juan"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Tu Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 312 987 6543"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ¿Dónde la viste? */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                ¿Dónde y cuándo la viste? *
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={sightingLocation}
                  onChange={(e) => setSightingLocation(e.target.value)}
                  placeholder="Ej: Cerca al parque de San Fernando, hoy a las 10am..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Estado del animal */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Estado del animal / Notas adicionales:
              </label>
              <textarea
                rows={2}
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Ej: Lo tengo resguardado en mi garaje / Iba caminando hacia la calle 5ta..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:bg-white focus:border-orange-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Foto del animal visto */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Foto del animal visto (Opcional pero muy útil):
              </label>
              <label className="border border-dashed border-stone-300 hover:border-orange-500 bg-stone-50 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition">
                {photoPreview ? (
                  <img src={photoPreview} alt="Avistamiento" className="w-12 h-12 object-cover rounded-lg border border-orange-300" />
                ) : (
                  <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                    <Camera className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 text-xs">
                  <span className="font-bold text-stone-900 block">
                    {photoPreview ? "✓ Foto del avistamiento adjunta" : "Tomar foto o subir de galería"}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Permite a los dueños confirmar al 100% que es su mascota
                  </span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            {/* Botón WhatsApp Informar Avistamiento */}
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 text-xs sm:text-sm transition active:scale-[0.98] cursor-pointer mt-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Enviar Avistamiento a Triaje Central</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
