"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import { saveOfflineReport } from "@/lib/offline-queue";
import { Camera, Upload, ArrowRight, ArrowLeft, Check, X, Loader2, Sparkles, MapPin } from "lucide-react";
import imageCompression from "browser-image-compression";
import barrioCoords from "@/data/coords_by_barrio.json";
import seedPets from "@/data/seed_pets.json";
import { supabase } from "@/lib/supabase";

interface ReportModalProps {
  initialType: "LOST" | "FOUND";
  onClose: () => void;
  onSuccess: (pet: PetReport) => void;
}

function getNextPetId(reportType: "LOST" | "FOUND"): string {
  const prefix = reportType === "LOST" ? "B" : "R";
  let maxNum = 0;
  for (const p of seedPets as any[]) {
    if (p.id && typeof p.id === "string" && p.id.startsWith(prefix)) {
      const num = parseInt(p.id.slice(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `${prefix}${maxNum + 1}`;
}

export default function ReportModal({ initialType, onClose, onSuccess }: ReportModalProps) {
  const [step, setStep] = useState<number>(1);
  const [reportType, setReportType] = useState<"LOST" | "FOUND">(initialType);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [analyzingAi, setAnalyzingAi] = useState<boolean>(false);
  const [aiDetected, setAiDetected] = useState<string | null>(null);

  // Form Fields
  const [species, setSpecies] = useState<"DOG" | "CAT" | "OTHER">("DOG");
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"MACHO" | "HEMBRA" | "UNKNOWN">("UNKNOWN");
  const [size, setSize] = useState<"PEQUEÑO" | "MEDIANO" | "GRANDE">("MEDIANO");
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompressing(true);
      setAiDetected(null);
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressed = await imageCompression(file, options);
        setPhotoBlob(compressed);
        
        // Create preview and base64 for Gemini Vision
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          setPhotoPreview(base64data);

          // Asynchronously call Gemini Vision API
          try {
            setAnalyzingAi(true);
            const res = await fetch("/api/analyze-pet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64data,
                mimeType: compressed.type || "image/jpeg",
              }),
            });
            const data = await res.json();
            if (data?.success && data?.traits) {
              const t = data.traits;
              if (t.species === "DOG" || t.species === "CAT") {
                setSpecies(t.species);
              }
              if (t.primary_color) {
                setPrimaryColor(t.primary_color);
              }
              if (t.search_summary) {
                setDistinctiveFeatures(t.search_summary);
              } else if (t.breed_likely) {
                setDistinctiveFeatures(`${t.breed_likely}. ${t.distinctive_marks || ""}`);
              }
              setAiDetected(t.search_summary || `${t.breed_likely} (${t.primary_color})`);
            }
          } catch (aiErr) {
            console.warn("AI analysis skipped or offline", aiErr);
          } finally {
            setAnalyzingAi(false);
          }
        };
        reader.readAsDataURL(compressed);
      } catch (error) {
        console.error("Compression error:", error);
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
      const generatedId = getNextPetId(reportType);

      const newPet: PetReport = {
        id: generatedId,
        report_type: reportType,
        species,
        name: name.trim() || (reportType === "LOST" ? "Sin nombre" : "Rescatado"),
        gender,
        primary_color: primaryColor.trim() || "Desconocido",
        secondary_color: "",
        pattern: "",
        size,
        neighborhood: neighborhood.trim() || "Cali Centro (General)",
        distinctive_features: distinctiveFeatures.trim(),
        photo_url: photoPreview || "/placeholder-pet.png",
        contact_name: contactName.trim() || "Reportante Anónimo",
        contact_phone: contactPhone.trim(),
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      };

      // Guardar en la cola local de IndexedDB inmediatamente (Resiliencia Offline)
      await saveOfflineReport(newPet, photoBlob || undefined);

      // Guardar en Supabase si está configurado
      if (supabase) {
        try {
          await supabase.from("pets").insert([newPet]);
        } catch (sbErr) {
          console.warn("Could not insert directly to Supabase:", sbErr);
        }
      }

      // Notificar por correo a busquedanimalcali@gmail.com
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "NEW_REPORT",
            data: { pet: newPet },
          }),
        });
      } catch (emailErr) {
        console.warn("Could not dispatch registration email:", emailErr);
      }
      
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
              La fotografía es la clave para que Gemini IA identifique los rasgos y compare la mascota automáticamente.
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
                    className="max-h-48 object-contain rounded-lg mb-2"
                  />
                  {analyzingAi && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini IA extrayendo rasgos físicos...</span>
                    </div>
                  )}
                  {aiDetected && !analyzingAi && (
                    <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-center mt-1">
                      ✨ Detectado: {aiDetected}
                    </div>
                  )}
                  <span className="text-[11px] text-neutral-400 underline mt-2">
                    Toca para cambiar la foto
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-4 bg-neutral-800 rounded-full text-amber-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-200 block">
                      Tomar foto o subir desde la galería
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Compresión automática en tu teléfono
                    </span>
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <div className="flex justify-end pt-4">
              <button
                disabled={!photoPreview || compressing}
                onClick={() => setStep(2)}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <span>Continuar a Detalles</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Detalles de la mascota */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Especie */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Especie *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSpecies("DOG")}
                  className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    species === "DOG"
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400"
                  }`}
                >
                  🐶 Perro
                </button>
                <button
                  type="button"
                  onClick={() => setSpecies("CAT")}
                  className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    species === "CAT"
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400"
                  }`}
                >
                  🐱 Gato
                </button>
              </div>
            </div>

            {/* Nombre, Sexo y Tamaño */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1 block">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={reportType === "LOST" ? "Ej: Dakota" : "Desconocido"}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1 block">
                  Sexo
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="UNKNOWN">No se sabe</option>
                  <option value="MACHO">Macho</option>
                  <option value="HEMBRA">Hembra</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 mb-1 block">
                  Tamaño *
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none font-semibold text-amber-400"
                >
                  <option value="PEQUEÑO">Pequeño</option>
                  <option value="MEDIANO">Mediano</option>
                  <option value="GRANDE">Grande</option>
                </select>
              </div>
            </div>

            {/* Color Principal */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Color Dominante / Pelaje *
              </label>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="Ej: Negro, Blanco con manchas cafés, Amarillo dorado..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Barrio en Cali */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Barrio en Cali donde se vio/rescató *
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="">Selecciona un Barrio...</option>
                {Object.keys(barrioCoords).map((b) => (
                  <option key={b} value={b}>
                    Barrio {b.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Rasgos distintivos */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Rasgos Distintivos o Accesorios
              </label>
              <textarea
                value={distinctiveFeatures}
                onChange={(e) => setDistinctiveFeatures(e.target.value)}
                rows={2}
                placeholder="Ej: Collar rojo, orejas erectas, mancha en ojo izquierdo..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Navegación */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-neutral-800 hover:bg-neutral-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 bg-amber-500 hover:bg-amber-400 font-extrabold text-black py-3 rounded-xl text-xs flex items-center justify-center gap-1"
              >
                <span>Contacto Seguro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Contacto Seguro */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
              <strong>🛡️ Protección Anti-Extorsión:</strong> Tu número de teléfono nunca será visible públicamente en internet. Los rescatistas y dueños deberán verificar una foto con el Triaje Central antes de ser conectados.
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Tu Nombre o Alias
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej: Familia Gómez / Rescatista Juan"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Tu WhatsApp o Teléfono (Protegido) *
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej: 315 123 4567"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 bg-neutral-800 hover:bg-neutral-700 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Publicar y Buscar Coincidencias</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
