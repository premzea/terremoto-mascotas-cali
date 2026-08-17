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
    <div className="fixed inset-0 bg-stone-900/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 text-stone-900 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-100 text-amber-800 p-2 rounded-xl border border-amber-300">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-stone-900 leading-tight">Escudo de Triaje Seguro</h3>
              <p className="text-xs text-stone-500">Protección contra extorsión y llamadas fraudulentas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm space-y-2">
            <p className="text-stone-600 text-xs">
              Estás reportando el avistamiento o rescate de:
            </p>
            <div className="font-black text-base text-stone-900">
              {pet.name} — {pet.species === "DOG" ? "Perro" : "Gato"} ({pet.primary_color}) en {pet.neighborhood}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Por seguridad de las familias afectadas, ningún teléfono privado se publica en internet. Para conectar ambas partes, sube una foto de confirmación.
            </p>
          </div>

          {!photoGiven ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                1. Sube o toma una foto del animal que encontraste:
              </label>
              <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
                <div className="p-3 bg-amber-100/70 text-amber-700 rounded-2xl mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-stone-900">Tomar foto o elegir de la galería</span>
                <span className="text-xs text-stone-500 mt-1">Obligatorio para desbloquear el Triaje</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                {filePreview && (
                  <img
                    src={filePreview}
                    alt="Evidencia"
                    className="w-16 h-16 object-cover rounded-lg border border-emerald-300"
                  />
                )}
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
                    <Check className="w-4 h-4 text-emerald-600" /> Foto de verificación cargada
                  </div>
                  <p className="text-stone-600 mt-0.5">
                    El equipo voluntario usará esta foto para confirmar la coincidencia con el dueño.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Lugar exacto o estado del animal (opcional):
                </label>
                <textarea
                  rows={2}
                  value={rescuerNotes}
                  onChange={(e) => setRescuerNotes(e.target.value)}
                  placeholder="Ej: Lo tengo resguardado en la panadería de la esquina..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-sm transition active:scale-[0.98]"
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
