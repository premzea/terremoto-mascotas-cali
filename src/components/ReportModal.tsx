"use client";

import { useState, useMemo } from "react";
import { PetReport } from "@/lib/types";
import { saveOfflineReport } from "@/lib/offline-queue";
import { Camera, Upload, ArrowRight, ArrowLeft, Check, X, Loader2, Sparkles, MapPin, AlertCircle } from "lucide-react";
import imageCompression from "browser-image-compression";
import barrioCoords from "@/data/coords_by_barrio.json";
import seedPets from "@/data/seed_pets.json";
import { supabase } from "@/lib/supabase";
import { LOCAL_CREATED_PETS_KEY } from "@/lib/data-service";
import MapLocationPicker from "./MapLocationPicker";

interface ReportModalProps {
  initialType: "LOST" | "FOUND";
  onClose: () => void;
  onSuccess: (pet: PetReport) => void;
}

const sortedBarrioList = Object.values(barrioCoords).sort((a: any, b: any) =>
  a.name.localeCompare(b.name)
);

function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [species, setSpecies] = useState<"DOG" | "CAT" | "OTHER">("DOG");
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"MACHO" | "HEMBRA" | "UNKNOWN">("UNKNOWN");
  const [isNeutered, setIsNeutered] = useState<"YES" | "NO" | "UNKNOWN">("UNKNOWN");
  const [breed, setBreed] = useState<string>("");
  const [size, setSize] = useState<"PEQUEÑO" | "MEDIANO" | "GRANDE">("MEDIANO");
  const [primaryColor, setPrimaryColor] = useState<string>("");
  
  // Barrio Search & Map State
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [barrioSearch, setBarrioSearch] = useState<string>("");
  const [showBarrioSuggestions, setShowBarrioSuggestions] = useState<boolean>(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>(undefined);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(undefined);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  
  const [distinctiveFeatures, setDistinctiveFeatures] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter Barrio suggestions
  const matchingBarrios = useMemo(() => {
    if (!barrioSearch.trim()) return [];
    const q = normalizeText(barrioSearch);
    return sortedBarrioList
      .filter((b: any) => {
        const normName = normalizeText(b.name);
        const normZone = b.zone ? normalizeText(b.zone) : "";
        return normName.includes(q) || normZone.includes(q);
      })
      .slice(0, 8);
  }, [barrioSearch]);

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
            const data = await res.json().catch(() => null);
            const meta = data?.traits || data?.metadata;
            if (meta) {
              const detectedSpecies = (meta.species || "").toUpperCase();
              if (detectedSpecies === "CAT" || detectedSpecies === "GATO") {
                setSpecies("CAT");
              } else if (detectedSpecies === "DOG" || detectedSpecies === "PERRO") {
                setSpecies("DOG");
              }
              if (meta.primary_color) {
                setPrimaryColor(meta.primary_color);
              }
              if (meta.breed_likely) {
                setBreed(meta.breed_likely);
              }
              if (meta.search_summary) {
                setDistinctiveFeatures(meta.search_summary);
              } else if (meta.distinctive_marks) {
                setDistinctiveFeatures(meta.distinctive_marks);
              }
              setAiDetected(meta.search_summary || `${detectedSpecies === "CAT" ? "Gato" : "Perro"} (${meta.primary_color || ""})`);
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
    setErrorMessage(null);
    try {
      // Build structured features including breed and castration status
      let assembledFeatures = distinctiveFeatures.trim();
      if (breed.trim()) {
        assembledFeatures = `Raza: ${breed.trim()}. ${assembledFeatures}`;
      }
      if (gender === "MACHO" && isNeutered !== "UNKNOWN") {
        assembledFeatures = `${isNeutered === "YES" ? "Macho Castrado" : "Macho Sin Castrar"}. ${assembledFeatures}`;
      }

      const tempFallbackId = getNextPetId(reportType);

      const petPayload: PetReport = {
        id: tempFallbackId,
        report_type: reportType,
        species,
        name: name.trim() || (reportType === "LOST" ? "Sin nombre" : "Rescatado"),
        gender,
        primary_color: primaryColor.trim() || "Deducido por IA",
        secondary_color: "",
        pattern: "",
        size,
        neighborhood: neighborhood.trim() || barrioSearch.trim() || "Cali Centro (General)",
        lat: selectedLat || (barrioCoords as any)[(neighborhood || barrioSearch).toLowerCase()]?.lat || 3.4516,
        lng: selectedLng || (barrioCoords as any)[(neighborhood || barrioSearch).toLowerCase()]?.lng || -76.532,
        distinctive_features: assembledFeatures.trim(),
        photo_url: photoPreview || "/placeholder-pet.png",
        contact_name: contactName.trim() || "Reportante Anónimo",
        contact_phone: contactPhone.trim(),
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      };

      // 1. Guardar en Supabase a través de /api/create-pet
      let createdPet: PetReport | null = null;
      let isOfflineSubmission = false;

      try {
        const res = await fetch("/api/create-pet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(petPayload),
        });

        const resData = await res.json().catch(() => null);

        if (res.ok && resData?.success && resData?.pet) {
          createdPet = resData.pet;
        } else if (res.status === 400 || !res.ok) {
          // Rejection from Supabase / Validation
          const errorMsg =
            resData?.error ||
            resData?.details ||
            `El servidor rechazó el registro (Código ${res.status}).`;
          console.error(`[ReportModal] Server rejected pet creation (${res.status}):`, {
            error: resData?.error,
            details: resData?.details,
            hint: resData?.hint,
            code: resData?.code,
          });
          setErrorMessage(errorMsg);
          setSubmitting(false);
          return; // Stop execution: prevent false success or saving rejected data!
        }
      } catch (networkErr) {
        console.warn("[ReportModal] Network error / offline mode detected:", networkErr);
        isOfflineSubmission = true;
        createdPet = petPayload;
      }

      if (!createdPet) {
        setErrorMessage("No se pudo procesar el reporte. Por favor intenta nuevamente.");
        setSubmitting(false);
        return;
      }

      // 2. Persistir localmente solo si es un envío offline pendiente
      if (isOfflineSubmission) {
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem(LOCAL_CREATED_PETS_KEY);
            const list = raw ? JSON.parse(raw) : [];
            const updated = [
              createdPet,
              ...list.filter((p: any) => p && p.id !== createdPet?.id && p.id !== tempFallbackId),
            ];
            localStorage.setItem(LOCAL_CREATED_PETS_KEY, JSON.stringify(updated));
          }
        } catch (lsErr) {
          console.warn("localStorage write error:", lsErr);
        }

        // Guardar en la cola local de IndexedDB
        await saveOfflineReport(createdPet, photoBlob || undefined);
      }

      onSuccess(createdPet);
      onClose();
    } catch (e: any) {
      console.error("handleFinish error:", e);
      setErrorMessage(e?.message || "Ocurrió un error inesperado al guardar el reporte.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 text-stone-900 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header con pasos */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
          <div>
            <span className="text-[11px] font-black tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              Paso {step} de 3
            </span>
            <h2 className="font-black text-lg text-stone-900 mt-1">
              {reportType === "LOST" ? "Reportar Mascota Perdida" : "Reportar Mascota Encontrada"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-fade-in shadow-xs"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 text-xs">No se pudo guardar el reporte</p>
              <p className="text-red-700 mt-0.5 text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Paso 1: Foto del animal */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-stone-600 leading-relaxed">
              La fotografía es la clave para que la Inteligencia Artificial deduzca automáticamente los colores del pelaje, la raza y compare la mascota.
            </p>

            <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer min-h-[220px] transition">
              {compressing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                  <span className="text-xs font-semibold text-stone-700">
                    Comprimiendo imagen con Web Worker...
                  </span>
                </div>
              ) : photoPreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-48 object-contain rounded-xl mb-2 shadow-xs"
                  />
                  {analyzingAi && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>IA deduciendo colores, especie y raza...</span>
                    </div>
                  )}
                  {aiDetected && !analyzingAi && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-center mt-1 font-semibold">
                      ✨ Detectado por IA: {aiDetected}
                    </div>
                  )}
                  <span className="text-[11px] text-stone-500 underline mt-2">
                    Toca para cambiar la foto
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-4 bg-amber-100/70 text-amber-700 rounded-2xl">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">
                      Subir o Tomar Foto del Animal
                    </span>
                    <span className="text-xs text-stone-500 block mt-1">
                      Toca aquí para seleccionar de tu galería o cámara
                    </span>
                  </div>
                  <span className="text-[10px] bg-white text-stone-600 px-2.5 py-1 rounded-full border border-stone-200 shadow-2xs">
                    JPG, PNG, WEBP (Comprimido automáticamente)
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              disabled={!photoPreview || compressing}
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-white py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-[0.98]"
            >
              <span>Continuar con Datos de la Mascota</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Paso 2: Datos de la mascota */}
        {step === 2 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Especie */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1.5 block">
                Especie *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSpecies("DOG")}
                  className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    species === "DOG"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs font-extrabold"
                      : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  🐶 Perro
                </button>
                <button
                  type="button"
                  onClick={() => setSpecies("CAT")}
                  className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    species === "CAT"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs font-extrabold"
                      : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  🐱 Gato
                </button>
                <button
                  type="button"
                  onClick={() => setSpecies("OTHER")}
                  className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    species === "OTHER"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs font-extrabold"
                      : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  🐾 Otro
                </button>
              </div>
            </div>

            {/* Nombre, Sexo y Tamaño */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={reportType === "LOST" ? "Ej: Dakota" : "Desconocido"}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Sexo
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none font-medium"
                >
                  <option value="UNKNOWN">No se sabe</option>
                  <option value="MACHO">Macho</option>
                  <option value="HEMBRA">Hembra</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1 block">
                  Tamaño *
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2.5 text-xs text-amber-800 focus:bg-white focus:border-amber-500 focus:outline-none font-bold"
                >
                  <option value="PEQUEÑO">Pequeño</option>
                  <option value="MEDIANO">Mediano</option>
                  <option value="GRANDE">Grande</option>
                </select>
              </div>
            </div>

            {/* Pregunta si está castrado en caso de ser MACHO */}
            {gender === "MACHO" && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1.5 animate-fade-in shadow-2xs">
                <label className="text-xs font-bold text-amber-900 block">
                  ¿El macho está castrado / esterilizado? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNeutered("NO")}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      isNeutered === "NO"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    No (Sin castrar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNeutered("YES")}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      isNeutered === "YES"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    Sí (Castrado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNeutered("UNKNOWN")}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      isNeutered === "UNKNOWN"
                        ? "bg-amber-500 text-white border-amber-500 font-extrabold shadow-xs"
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    No se sabe
                  </button>
                </div>
              </div>
            )}

            {/* Raza de la Mascota */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Raza de la Mascota *
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Ej: Criollo / Mestizo, Pitbull, Poodle, Labrador, Siamés..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {["Criollo / Mestizo", "Pitbull", "Poodle / Caniche", "Labrador", "Pinscher", "Siamés"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBreed(r)}
                    className="text-[10px] bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 px-2 py-0.5 rounded-md border border-stone-200 transition font-medium"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Color de Pelaje Deducido por la Máquina */}
            <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between text-xs">
              <span className="text-stone-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Color del pelaje (IA):
              </span>
              <strong className="text-amber-900 font-bold">
                {primaryColor || "Deducido automáticamente de la foto"}
              </strong>
            </div>

            {/* Barrio / Ubicación en Cali y Jamundí con Búsqueda Escrita */}
            <div className="relative">
              <div className="flex items-start justify-between mb-1.5 gap-2">
                <div>
                  <label className="text-xs font-black text-stone-900 block">
                    {reportType === "LOST"
                      ? "¿Dónde fue vista por última vez? (Barrio o punto) *"
                      : "¿En qué barrio o punto fue ENCONTRADO/RESCATADO? *"}
                  </label>
                  <span className="text-[10.5px] text-stone-500 block mt-0.5 leading-snug">
                    {reportType === "LOST"
                      ? "Lugar de pérdida para calcular la cercanía con animales encontrados"
                      : "Punto donde se recogió al animal (NO la dirección de tu casa/refugio actual)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-[11px] text-amber-900 hover:text-amber-950 font-extrabold flex items-center gap-1 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg border border-amber-300 transition shadow-2xs flex-shrink-0 mt-0.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>📍 Mapa / GPS</span>
                </button>
              </div>

              {neighborhood ? (
                /* Barrio ya seleccionado */
                <div className="bg-amber-50/80 border border-amber-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <strong className="text-stone-900 text-xs block font-bold">{neighborhood}</strong>
                      {selectedLat && (
                        <span className="text-[10px] text-stone-500">
                          Coordenadas: {selectedLat.toFixed(3)}, {selectedLng?.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNeighborhood("");
                      setBarrioSearch("");
                      setSelectedLat(undefined);
                      setSelectedLng(undefined);
                      setShowBarrioSuggestions(false);
                    }}
                    className="p-1 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition"
                    title="Cambiar barrio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Buscador de barrio */
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={barrioSearch}
                    onChange={(e) => {
                      setBarrioSearch(e.target.value);
                      setShowBarrioSuggestions(true);
                    }}
                    onFocus={() => setShowBarrioSuggestions(true)}
                    placeholder="Escribe el barrio (Ej: Nápoles, Valle del Lili, Alfaguara...)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                  {barrioSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarrioSearch("");
                        setShowBarrioSuggestions(false);
                      }}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Sugerencias de Autocompletado de Barrios */}
                  {showBarrioSuggestions && matchingBarrios.length > 0 && (
                    <div className="absolute left-0 right-0 top-12 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-stone-100">
                      {matchingBarrios.map((b: any) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => {
                            setNeighborhood(b.name);
                            setBarrioSearch(b.name);
                            setSelectedLat(b.lat);
                            setSelectedLng(b.lng);
                            setShowBarrioSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-amber-50 flex items-center justify-between text-xs transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span className="font-bold text-stone-900">{b.name}</span>
                          </div>
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 font-semibold">
                            {b.zone || `Comuna ${b.comuna}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rasgos distintivos */}
            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Rasgos Distintivos o Accesorios
              </label>
              <textarea
                value={distinctiveFeatures}
                onChange={(e) => setDistinctiveFeatures(e.target.value)}
                rows={2}
                placeholder="Ej: Collar rojo, orejas erectas, mancha en ojo izquierdo..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Navegación */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-extrabold text-white py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition active:scale-[0.98]"
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
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed shadow-2xs">
              <strong>🛡️ Protección Anti-Extorsión:</strong> Tu número de teléfono nunca será visible públicamente en internet. Los rescatistas y dueños deberán verificar una foto con el Triaje Central antes de ser conectados.
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Tu Nombre o Alias
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej: Familia Gómez / Rescatista Juan"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 mb-1 block">
                Tu WhatsApp o Teléfono (Protegido) *
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej: 315 123 4567"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
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

        {/* Map Location Picker Modal */}
        {showMapPicker && (
          <MapLocationPicker
            initialBarrio={neighborhood || barrioSearch}
            initialLat={selectedLat}
            initialLng={selectedLng}
            onSelectLocation={(loc) => {
              setNeighborhood(loc.neighborhood);
              setBarrioSearch(loc.neighborhood);
              setSelectedLat(loc.lat);
              setSelectedLng(loc.lng);
            }}
            onClose={() => setShowMapPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
