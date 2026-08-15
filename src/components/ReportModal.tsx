"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { saveOfflineReport } from "@/lib/offline-queue";
import { PetReport } from "@/lib/types";
import { Camera, X, Check, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface ReportModalProps {
  initialType?: "LOST" | "FOUND";
  onClose: () => void;
  onSuccess: (newPet: PetReport) => void;
}

export default function ReportModal({ initialType = "LOST", onClose, onSuccess }: ReportModalProps) {
  const [step, setStep] = useState<number>(1);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [reportType, setReportType] = useState<"LOST" | "FOUND">(initialType);
  const [species, setSpecies] = useState<"DOG" | "CAT" | "OTHER">("DOG");
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"MACHO" | "HEMBRA" | "UNKNOWN">("UNKNOWN");
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");

  // Photo
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompressing(true);
      try {
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressed = await imageCompression(file, options);
        setPhotoBlob(compressed);
        setPhotoPreview(URL.createObjectURL(compressed));
      } catch (err) {
        console.error("Compression error", err);
        setPhotoBlob(file);
        setPhotoPreview(URL.createObjectURL(file));
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const newPet: PetReport = {
        id: `LOCAL-${Date.now()}`,
        report_type: reportType,
        species,
        name: name.trim() || (reportType === "LOST" ? "Sin nombre" : "Rescatado"),
        gender,
        primary_color: primaryColor.trim() || "Desconocido",
        secondary_color: "",
        pattern: "",
        size: "MEDIANO",
        neighborhood: neighborhood.trim() || "Cali (Sin especificar)",
        distinctive_features: distinctiveFeatures.trim(),
        photo_url: photoPreview || "/photos/Cartel Bonic Perro.jpeg",
        contact_name: contactName.trim() || "Reportante Anónimo",
        contact_phone: contactPhone.trim(),
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      };

      // Guardar en la cola local de IndexedDB inmediatamente (Resiliencia Offline)
      await saveOfflineReport(newPet, photoBlob || undefined);
      
      onSuccess(newPet);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#121214] border border-neutral-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 text-white max-h-[92vh] overflow-y-auto">
        {/* Header con pasos */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div>
            <span className="text-[11px] font-black tracking-wider uppercase text-amber-400">
              Paso {step} de 3
            </span>
            <h2 className="font-extrabold text-lg">
              {reportType === "LOST" ? "Reportar Mascota Perdida" : "Reportar Mascota Encontrada"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paso 1: Foto del animal */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-neutral-400 leading-relaxed">
              La fotografía es la clave para que la red y la IA identifiquen a la mascota rápidamente.
            </p>

            <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500 bg-neutral-900/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer min-h-[220px]">
              {compressing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <span className="text-xs font-semibold text-neutral-300">
                    Comprimiendo imagen con Web Worker...
                  </span>
                </div>
              ) : photoPreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-40 rounded-lg object-contain mb-3"
                  />
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Foto lista (Optimizada para bajo ancho de banda)
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-1">Toca para cambiar</span>
                </div>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-amber-400 mb-2" />
                  <span className="font-bold text-sm text-white">Tomar foto o subir de galería</span>
                  <span className="text-[11px] text-neutral-500 mt-1">
                    Comprime automáticamente para ahorrar datos móviles
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportType("LOST")}
                className={`flex-1 py-3 rounded-lg text-xs font-bold border ${
                  reportType === "LOST"
                    ? "bg-red-600 border-red-500 text-white"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400"
                }`}
              >
                Es mi mascota (Se me perdió)
              </button>
              <button
                type="button"
                onClick={() => setReportType("FOUND")}
                className={`flex-1 py-3 rounded-lg text-xs font-bold border ${
                  reportType === "FOUND"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400"
                }`}
              >
                La encontré / La resguardé
              </button>
            </div>

            <button
              disabled={compressing}
              onClick={() => setStep(2)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Paso 2: Detalles del Animal */}
        {step === 2 && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Especie</label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="DOG">🐶 Perro</option>
                  <option value="CAT">🐱 Gato</option>
                  <option value="OTHER">🐾 Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Sexo</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="UNKNOWN">Desconocido</option>
                  <option value="MACHO">Macho</option>
                  <option value="HEMBRA">Hembra</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                {reportType === "LOST" ? "Nombre de la mascota" : "Nombre provisional (opcional)"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={reportType === "LOST" ? "Ej: Bonic, Toby..." : "Ej: Desconocido"}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Color Principal / Pelaje</label>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="Ej: Negro con manchas blancas, Café claro..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Barrio o Sector de Cali
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ej: Meléndez, Cambulos, San Fernando, Valle del Lili..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Rasgo distintivo o collar (opcional)
              </label>
              <input
                type="text"
                value={distinctiveFeatures}
                onChange={(e) => setDistinctiveFeatures(e.target.value)}
                placeholder="Ej: Mancha café en oreja izquierda, collar rojo..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-neutral-800 text-neutral-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                Continuar a Contacto <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Contacto Seguro */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-relaxed">
                <strong>Privacidad Garantizada:</strong> Tu número no será público en la web. El equipo de Triaje de Voluntarios intermediará las llamadas para protegerte de extorsiones.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Tu Nombre o Apodo</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej: Carlos Gómez"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Teléfono WhatsApp de Contacto</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej: 3151234567"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-sm text-white"
              />
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-neutral-800 text-neutral-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-950/40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Publicar Reporte (Optimista)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
