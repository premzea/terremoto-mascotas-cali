"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import { CENTRAL_TRIAGE_WHATSAPP } from "@/lib/data-service";
import { ShieldCheck, Camera, X, Check, Lock } from "lucide-react";

interface ContactGateModalProps {
  pet: PetReport;
  onClose: () => void;
}

export default function ContactGateModal({ pet, onClose }: ContactGateModalProps) {
  const [photoGiven, setPhotoGiven] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [rescuerNotes, setRescuerNotes] = useState<string>("");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFilePreview(URL.createObjectURL(file));
      setPhotoGiven(true);
    }
  };

  const getWhatsAppLink = () => {
    const text = encodeURIComponent(
      `🚨 *REPORTE DE MASCOTA ENCONTRADA - TERREMOTO CALI*\n` +
      `Caso ID: ${pet.id}\n` +
      `Mascota buscada: ${pet.name} (${pet.species})\n` +
      `Barrio del reporte: ${pet.neighborhood}\n` +
      `Nota del rescatista: ${rescuerNotes || "Tengo una foto del animal encontrado."}\n\n` +
      `_Hola equipo de Triaje Central, adjunto la foto para que validen con el dueño antes de contactarlo._`
    );
    return `https://wa.me/${CENTRAL_TRIAGE_WHATSAPP}?text=${text}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#18181b] border border-neutral-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Escudo de Triaje Seguro</h3>
              <p className="text-xs text-neutral-400">Protección contra extorsión telefónica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-neutral-900/90 p-4 rounded-xl border border-neutral-800 text-sm space-y-2">
            <p className="text-neutral-300">
              Estás reportando el avistamiento o rescate de:
            </p>
            <div className="font-bold text-base text-amber-400">
              {pet.name} — {pet.species === "DOG" ? "Perro" : "Gato"} ({pet.primary_color}) en {pet.neighborhood}
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Por seguridad de la familia afectada por el sismo, ningún número de teléfono privado se publica directamente. Para mediar el contacto, debes proporcionar una fotografía del animal que tienes.
            </p>
          </div>

          {!photoGiven ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-neutral-200">
                1. Sube o toma una foto del animal que encontraste:
              </label>
              <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500 bg-neutral-900 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
                <Camera className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-sm font-bold text-white">Tomar foto o elegir de la galería</span>
                <span className="text-xs text-neutral-500 mt-1">Obligatorio para desbloquear el Triaje</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl">
                {filePreview && (
                  <img
                    src={filePreview}
                    alt="Evidencia"
                    className="w-16 h-16 object-cover rounded-lg border border-emerald-700"
                  />
                )}
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                    <Check className="w-4 h-4" /> Foto de verificación cargada
                  </div>
                  <p className="text-neutral-400 mt-0.5">
                    El equipo voluntario usará esta foto para confirmar la coincidencia con el dueño.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Lugar exacto o estado del animal (opcional):
                </label>
                <textarea
                  rows={2}
                  value={rescuerNotes}
                  onChange={(e) => setRescuerNotes(e.target.value)}
                  placeholder="Ej: Lo tengo resguardado en la panadería de la esquina..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 text-base"
              >
                <ShieldCheck className="w-5 h-5" />
                Contactar Triaje Central en WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
