"use client";

import { useState, useMemo, useRef } from "react";
import { PetReport } from "@/lib/types";
import { saveOfflineReport } from "@/lib/offline-queue";
import { Camera, Upload, ArrowRight, ArrowLeft, Check, X, Loader2, Sparkles, MapPin, AlertCircle, Image as ImageIcon, RefreshCw, Crop } from "lucide-react";
import imageCompression from "browser-image-compression";
import barrioCoords from "@/data/coords_by_barrio.json";
import seedPets from "@/data/seed_pets.json";
import { supabase } from "@/lib/supabase";
import { LOCAL_CREATED_PETS_KEY } from "@/lib/data-service";
import MapLocationPicker from "./MapLocationPicker";
import ImageCropperModal from "./ImageCropperModal";
import SearchableBreedSelect from "./SearchableBreedSelect";
import SearchableEnumSelect, { EnumOption } from "./SearchableEnumSelect";

interface ReportModalProps {
  initialType: "LOST" | "FOUND";
  allPets?: PetReport[];
  onClose: () => void;
  onSuccess: (pet: PetReport) => void;
  onSelectExistingPet?: (pet: PetReport) => void;
}

const COLOR_PALETTE = [
  { id: "BLACK", label: "Negro", bg: "#1f2937", border: "#374151" },
  { id: "WHITE", label: "Blanco", bg: "#ffffff", text: "#000000", border: "#d1d5db" },
  { id: "BROWN", label: "Café / Marrón", bg: "#78350f", border: "#92400e" },
  { id: "GOLDEN_YELLOW", label: "Dorado / Amarillo", bg: "#d97706", border: "#f59e0b" },
  { id: "ORANGE_RED", label: "Naranja / Rojo", bg: "#ea580c", border: "#f97316" },
  { id: "GRAY_SILVER", label: "Gris / Plateado", bg: "#6b7280", border: "#9ca3af" },
  { id: "CREAM", label: "Crema / Beige", bg: "#fef3c7", text: "#78350f", border: "#fde68a" },
];

const COLOR_NAME_MAP: Record<string, string> = {
  BLACK: "Negro",
  WHITE: "Blanco",
  BROWN: "Café / Marrón",
  GOLDEN_YELLOW: "Dorado / Amarillo",
  ORANGE_RED: "Naranja / Rojo",
  GRAY_SILVER: "Gris / Plateado",
  CREAM: "Crema / Beige",
};

const EAR_TYPE_OPTIONS: EnumOption[] = [
  { id: "ERECT", label: "Paradas / Erectas / Puntiagudas", icon: "🔺" },
  { id: "FLOPPY", label: "Caídas / Gachas / Dobladas", icon: "🔻" },
  { id: "SEMI_ERECT", label: "Semi-erectas / Puntas dobladas", icon: "📐" },
  { id: "UNKNOWN", label: "No se distingue / Sin definir", icon: "❓" },
];

const EYE_COLOR_OPTIONS: EnumOption[] = [
  { id: "BLACK", label: "Negro / Muy Oscuro", icon: "⚫" },
  { id: "BROWN", label: "Café / Marrón", icon: "🟤" },
  { id: "BLUE", label: "Azul / Celeste / Zarco", icon: "🔵" },
  { id: "GREEN", label: "Verde / Esmeralda", icon: "🟢" },
  { id: "AMBER", label: "Ámbar / Miel / Amarillo", icon: "🟡" },
  { id: "HETEROCHROMIA", label: "Heterocromía (Ojos diferentes)", icon: "👁️" },
  { id: "UNKNOWN", label: "No se distingue / Sin definir", icon: "❓" },
];

const NOSE_COLOR_OPTIONS: EnumOption[] = [
  { id: "BLACK", label: "Negra", icon: "⚫" },
  { id: "PINK", label: "Rosada / Despigmentada", icon: "🌸" },
  { id: "BROWN", label: "Café / Hígado", icon: "🟤" },
  { id: "SPOTTED", label: "Manchada / Bicolor / Con pecas", icon: "⚪" },
  { id: "UNKNOWN", label: "No se distingue / Sin definir", icon: "❓" },
];

const COAT_PATTERN_OPTIONS: EnumOption[] = [
  { id: "SOLID", label: "Sólido / Unicolor", icon: "⬛" },
  { id: "BICOLOR_TUXEDO", label: "Bicolor / Pechera o patitas blancas (Tuxedo)", icon: "👔" },
  { id: "STRIPED_TABBY", label: "Atigrado / Rayado (Tabby)", icon: "🐅" },
  { id: "SPOTTED", label: "Manchas / Moteado (Dálmata, etc.)", icon: "🐾" },
  { id: "PATCHED_CALICO", label: "Calicó / Carey (Tricolor)", icon: "🎨" },
  { id: "MERLE_BRINDLE", label: "Abigarrado / Brindle / Jaspeado", icon: "🦓" },
  { id: "POINTED_SIAMESE", label: "Puntas oscuras (Siamés)", icon: "🐱" },
  { id: "UNKNOWN", label: "No se distingue / Sin definir", icon: "❓" },
];

const FUR_LENGTH_OPTIONS: EnumOption[] = [
  { id: "SHORT", label: "Corto / Raso", icon: "🪒" },
  { id: "MEDIUM", label: "Medio / Estándar", icon: "✂️" },
  { id: "LONG", label: "Largo / Abundante / Esponjoso", icon: "🦁" },
  { id: "HAIRLESS", label: "Sin pelo / Lampiño", icon: "🧴" },
  { id: "UNKNOWN", label: "No se distingue / Sin definir", icon: "❓" },
];

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

export default function ReportModal({
  initialType,
  allPets = [],
  onClose,
  onSuccess,
  onSelectExistingPet,
}: ReportModalProps) {
  const [step, setStep] = useState<number>(1);
  const [reportType, setReportType] = useState<"LOST" | "FOUND">(initialType);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [analyzingAi, setAnalyzingAi] = useState<boolean>(false);
  const [aiDetected, setAiDetected] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Duplicate Check Modal State
  const [duplicateMatch, setDuplicateMatch] = useState<{ pet: PetReport; score: number; reasons: string[] } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);

  // Hidden File & Camera Input Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [species, setSpecies] = useState<"DOG" | "CAT" | "OTHER">("DOG");
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"MACHO" | "HEMBRA" | "UNKNOWN">("UNKNOWN");
  const [isNeutered, setIsNeutered] = useState<"YES" | "NO" | "UNKNOWN">("UNKNOWN");
  const [breed, setBreed] = useState<string>("");
  const [size, setSize] = useState<"PEQUEÑO" | "MEDIANO" | "GRANDE">("MEDIANO");
  const [primaryColor, setPrimaryColor] = useState<string>("");

  // 6 Visual Characteristics for AI Extraction & User Confirmation
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [earType, setEarType] = useState<string>("UNKNOWN");
  const [eyeColor, setEyeColor] = useState<string>("UNKNOWN");
  const [noseColor, setNoseColor] = useState<string>("UNKNOWN");
  const [coatPattern, setCoatPattern] = useState<string>("UNKNOWN");
  const [furLength, setFurLength] = useState<string>("UNKNOWN");
  
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
  const [additionalContacts, setAdditionalContacts] = useState<Array<{ name: string; phone: string }>>([]);
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

  const addContact = () => {
    setAdditionalContacts((prev) => [...prev, { name: "", phone: "" }]);
  };

  const updateContact = (index: number, field: "name" | "phone", val: string) => {
    setAdditionalContacts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const removeContact = (index: number) => {
    setAdditionalContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setRawImageForCrop(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const processFinalPhoto = async (targetBlob: Blob, dataUrl: string) => {
    setCompressing(true);
    setAiDetected(null);
    setPhotoPreview(dataUrl);

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressed = await imageCompression(targetBlob as File, options);
      setPhotoBlob(compressed);

      // Asynchronously call Gemini Vision API with cropped focused image
      try {
        setAnalyzingAi(true);
        const res = await fetch("/api/analyze-pet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: dataUrl,
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

          // Populate the 6 AI Visual Characteristics (User Confirmed)
          if (meta.coat_colors && Array.isArray(meta.coat_colors) && meta.coat_colors.length > 0) {
            setSelectedColors(meta.coat_colors);
            const spanishList = meta.coat_colors.map((c: string) => COLOR_NAME_MAP[c] || c).join(", ");
            setPrimaryColor(spanishList);
          } else if (meta.primary_color) {
            setPrimaryColor(meta.primary_color);
          }

          if (meta.ear_type) setEarType(meta.ear_type);
          if (meta.eye_color) setEyeColor(meta.eye_color);
          if (meta.nose_color) setNoseColor(meta.nose_color);
          if (meta.coat_pattern) setCoatPattern(meta.coat_pattern);
          if (meta.fur_length) setFurLength(meta.fur_length);

          if (meta.breed_likely) {
            setBreed(meta.breed_likely);
          }
          if (meta.distinctive_marks) {
            setDistinctiveFeatures(meta.distinctive_marks);
          }
          setAiDetected(meta.search_summary || `${detectedSpecies === "CAT" ? "Gato" : "Perro"} (${meta.primary_color || ""})`);
        }
      } catch (aiErr) {
        console.warn("AI analysis skipped or offline", aiErr);
      } finally {
        setAnalyzingAi(false);
      }
    } catch (err) {
      console.error("Compression error:", err);
      setPhotoBlob(targetBlob);
    } finally {
      setCompressing(false);
    }
  };

  const handleCropComplete = (croppedBlob: Blob, croppedDataUrl: string) => {
    setRawImageForCrop(null);
    processFinalPhoto(croppedBlob, croppedDataUrl);
  };

  const handleCropCancel = () => {
    if (rawImageForCrop && !photoPreview) {
      fetch(rawImageForCrop)
        .then((res) => res.blob())
        .then((blob) => {
          processFinalPhoto(blob, rawImageForCrop);
        })
        .catch(() => {
          setPhotoPreview(rawImageForCrop);
        });
    }
    setRawImageForCrop(null);
  };

  // Step 1 -> Step 2 with Duplicate Pre-Check
  const handleProceedToStep2 = () => {
    // Check for duplicates in SAME category (LOST vs LOST, or FOUND vs FOUND)
    const pool = (allPets && allPets.length > 0 ? allPets : (seedPets as PetReport[])).filter(
      (p) => p.report_type === reportType && p.status !== "CLOSED" && p.status !== "REUNITED"
    );

    if (pool.length > 0) {
      // Find matches with same breed or color characteristics
      const qColor = (primaryColor || "").toLowerCase();
      const qBreed = (breed || "").toLowerCase();
      const qFeatures = (distinctiveFeatures || "").toLowerCase();

      const candidate = pool.find((p) => {
        const pColor = (p.primary_color || "").toLowerCase();
        const pDesc = (p.distinctive_features || "").toLowerCase();
        const colorMatch = qColor && pColor && (pColor.includes(qColor) || qColor.includes(pColor));
        const breedMatch = qBreed && pDesc && pDesc.includes(qBreed);
        const nameMatch = name && p.name && p.name.toLowerCase() === name.toLowerCase();
        return (colorMatch && breedMatch) || (nameMatch && colorMatch);
      });

      if (candidate) {
        setDuplicateMatch({
          pet: candidate,
          score: 85,
          reasons: [
            `Mismo reporte previo en categoría ${reportType === "LOST" ? "Perdidos" : "Encontrados"}`,
            `Color compatible: ${candidate.primary_color}`,
            `Ubicación registrada: ${candidate.neighborhood}`,
          ],
        });
        setShowDuplicateModal(true);
        return;
      }
    }

    setStep(2);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      // Convert selected color IDs to Spanish string
      const computedColorString = selectedColors.length > 0
        ? selectedColors.map((c) => COLOR_NAME_MAP[c] || c).join(", ")
        : primaryColor.trim() || "Deducido por IA";

      // Assemble confirmed traits for distinctive_features & search
      const confirmedTraitsList: string[] = [];
      
      const earOpt = EAR_TYPE_OPTIONS.find((o) => o.id === earType);
      if (earOpt && earType !== "UNKNOWN") confirmedTraitsList.push(`Orejas: ${earOpt.label.split(" / ")[0]}`);

      const eyeOpt = EYE_COLOR_OPTIONS.find((o) => o.id === eyeColor);
      if (eyeOpt && eyeColor !== "UNKNOWN") confirmedTraitsList.push(`Ojos: ${eyeOpt.label.split(" / ")[0]}`);

      const noseOpt = NOSE_COLOR_OPTIONS.find((o) => o.id === noseColor);
      if (noseOpt && noseColor !== "UNKNOWN") confirmedTraitsList.push(`Trufa/Nariz: ${noseOpt.label.split(" / ")[0]}`);

      const patOpt = COAT_PATTERN_OPTIONS.find((o) => o.id === coatPattern);
      if (patOpt && coatPattern !== "UNKNOWN") confirmedTraitsList.push(`Patrón: ${patOpt.label.split(" / ")[0]}`);

      const furOpt = FUR_LENGTH_OPTIONS.find((o) => o.id === furLength);
      if (furOpt && furLength !== "UNKNOWN") confirmedTraitsList.push(`Pelaje: ${furOpt.label.split(" / ")[0]}`);

      let assembledFeatures = distinctiveFeatures.trim();
      if (confirmedTraitsList.length > 0) {
        assembledFeatures = `${confirmedTraitsList.join(". ")}. ${assembledFeatures}`.trim();
      }
      if (breed.trim()) {
        assembledFeatures = `Raza: ${breed.trim()}. ${assembledFeatures}`;
      }
      if (gender === "MACHO" && isNeutered !== "UNKNOWN") {
        assembledFeatures = `${isNeutered === "YES" ? "Macho Castrado" : "Macho Sin Castrar"}. ${assembledFeatures}`;
      }

      const tempFallbackId = getNextPetId(reportType);

      // Merge multiple contacts into database columns
      const allValidPhones = [contactPhone.trim(), ...additionalContacts.map((c) => c.phone.trim())].filter(Boolean);
      const allValidNames = [contactName.trim(), ...additionalContacts.map((c) => c.name.trim())].filter(Boolean);

      const finalPhone = allValidPhones.join(" / ") || contactPhone.trim();
      const finalName = allValidNames.join(" / ") || contactName.trim() || (reportType === "LOST" ? "Dueño / Reportante" : "Rescatista");

      const petPayload: PetReport = {
        id: tempFallbackId,
        report_type: reportType,
        species,
        name: name.trim() || (reportType === "LOST" ? "Sin nombre" : "Rescatado"),
        gender,
        primary_color: computedColorString,
        secondary_color: "",
        pattern: coatPattern !== "UNKNOWN" ? coatPattern : "",
        size,
        neighborhood: neighborhood.trim() || barrioSearch.trim() || "Cali Centro (General)",
        lat: selectedLat || (barrioCoords as any)[(neighborhood || barrioSearch).toLowerCase()]?.lat || 3.4516,
        lng: selectedLng || (barrioCoords as any)[(neighborhood || barrioSearch).toLowerCase()]?.lng || -76.532,
        distinctive_features: assembledFeatures.trim(),
        photo_url: photoPreview || "/placeholder-pet.png",
        contact_name: finalName,
        contact_phone: finalPhone,
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
          const errorMsg =
            resData?.error ||
            resData?.details ||
            `El servidor rechazó el registro (Código ${res.status}).`;
          console.error(`[ReportModal] Server rejected pet creation (${res.status}):`, {
            error: resData?.error,
            details: resData?.details,
          });
          setErrorMessage(errorMsg);
          setSubmitting(false);
          return;
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

      // 2. Persistir localmente si es offline
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
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition cursor-pointer"
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
              {reportType === "LOST"
                ? "Sube una foto clara de tu mascota perdida desde tu galería. La IA analizará sus colores, raza y rasgos para cotejarla automáticamente."
                : "Fotografía al animal rescatado o sube una imagen de tu galería. La IA extraerá los rasgos para buscar a su familia."}
            </p>

            {/* Inputs ocultos para Cámara directa y Galería */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {compressing ? (
              <div className="border-2 border-dashed border-amber-400 bg-amber-50/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
                <span className="text-xs font-bold text-stone-800">
                  Procesando y optimizando imagen...
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5">
                  Comprimiendo para envío ultra rápido
                </span>
              </div>
            ) : photoPreview ? (
              <div className="border border-stone-200 bg-stone-50 rounded-2xl p-4 flex flex-col items-center">
                <div className="relative w-full max-h-56 flex items-center justify-center overflow-hidden rounded-xl bg-black/5 p-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-52 object-contain rounded-lg shadow-xs"
                  />
                </div>

                {analyzingAi && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 animate-pulse mt-3">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>IA deduciendo colores, especie y raza...</span>
                  </div>
                )}
                {aiDetected && !analyzingAi && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-center mt-2.5 font-semibold w-full">
                    ✨ {aiDetected}
                  </div>
                )}

                {/* Opciones para recortar o cambiar foto */}
                {reportType === "LOST" ? (
                  <div className="grid grid-cols-2 gap-2 w-full mt-3">
                    <button
                      type="button"
                      onClick={() => setRawImageForCrop(photoPreview)}
                      className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-[0.98] cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-amber-600" />
                      <span>Recortar / Encuadrar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-2.5 px-3 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-[0.98] cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
                      <span>Cambiar Foto</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 w-full mt-3">
                    <button
                      type="button"
                      onClick={() => setRawImageForCrop(photoPreview)}
                      className="py-2 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-[11px] font-extrabold flex items-center justify-center gap-1 transition shadow-2xs active:scale-[0.98] cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-amber-600" />
                      <span>Recortar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2 px-2 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-stone-800 text-[11px] font-bold flex items-center justify-center gap-1 transition shadow-2xs active:scale-[0.98] cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cámara</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-2 px-2 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-stone-800 text-[11px] font-bold flex items-center justify-center gap-1 transition shadow-2xs active:scale-[0.98] cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
                      <span>Galería</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {reportType === "LOST" ? (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold p-5 rounded-2xl flex items-center justify-center gap-4 shadow-md shadow-amber-500/20 active:scale-[0.98] transition group text-left cursor-pointer"
                  >
                    <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition flex-shrink-0">
                      <ImageIcon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm sm:text-base font-black leading-tight">
                        🖼️ Seleccionar Foto de la Galería
                      </span>
                      <span className="block text-[11px] text-amber-100 font-medium mt-0.5">
                        Elige una foto guardada en tu teléfono o computador
                      </span>
                    </div>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold p-4 rounded-2xl flex items-center justify-center gap-3.5 shadow-md shadow-amber-500/20 active:scale-[0.98] transition group text-left cursor-pointer"
                    >
                      <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition flex-shrink-0">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-black leading-tight">
                          📸 Tomar Foto con la Cámara
                        </span>
                        <span className="block text-[11px] text-amber-100 font-medium mt-0.5">
                          Abre directamente la cámara de tu celular
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-300 hover:border-stone-400 text-stone-800 font-bold p-3.5 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition text-left cursor-pointer"
                    >
                      <div className="p-2 bg-stone-200/70 rounded-xl flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-stone-700" />
                      </div>
                      <div className="flex-1">
                        <span className="block text-xs font-bold text-stone-900">
                          🖼️ Subir desde Galería o Archivos
                        </span>
                        <span className="block text-[10px] text-stone-500 font-normal">
                          Si ya le tomaste una foto previamente
                        </span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!photoPreview || compressing}
              onClick={handleProceedToStep2}
              className="w-full bg-stone-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-white py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] mt-2 cursor-pointer"
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
                  ❓ No sé / Otro
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

            {/* Raza de la Mascota con Selector Inteligente y Autocompletado */}
            <SearchableBreedSelect
              species={species}
              value={breed}
              onChange={setBreed}
            />

            {/* Sección de Rasgos Visuales Identificados por la IA — Revisión y Confirmación */}
            <div className="bg-stone-50/90 border border-stone-200 rounded-2xl p-3.5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-stone-900">
                      Rasgos Visuales Identificados por la IA
                    </h4>
                    <p className="text-[10.5px] text-stone-500">
                      Revisa y ajusta los colores o características antes de guardar:
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Colores de Pelaje con Botones Multiselección */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <span>🎨</span>
                    <span>Colores de Pelaje (puedes marcar varios):</span>
                  </label>
                  {selectedColors.length > 0 && (
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                      {selectedColors.length} seleccionado(s)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.map((color) => {
                    const isSelected = selectedColors.includes(color.id);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? selectedColors.filter((c) => c !== color.id)
                            : [...selectedColors, color.id];
                          setSelectedColors(updated);
                          const spanishList = updated.map((c) => COLOR_NAME_MAP[c] || c).join(", ");
                          setPrimaryColor(spanishList);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm font-extrabold"
                            : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                          style={{ backgroundColor: color.bg }}
                        />
                        {color.label}
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Grid de 5 Selectores de Enums con Buscador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                {/* Tipo de Orejas */}
                <SearchableEnumSelect
                  label="Tipo de Orejas"
                  icon={<span>🔺</span>}
                  options={EAR_TYPE_OPTIONS}
                  value={earType}
                  onChange={setEarType}
                  placeholder="Seleccionar tipo de orejas..."
                />

                {/* Color de Ojos */}
                <SearchableEnumSelect
                  label="Color de Ojos"
                  icon={<span>👁️</span>}
                  options={EYE_COLOR_OPTIONS}
                  value={eyeColor}
                  onChange={setEyeColor}
                  placeholder="Seleccionar color de ojos..."
                />

                {/* Color de Nariz / Trufa */}
                <SearchableEnumSelect
                  label="Color de Nariz / Trufa"
                  icon={<span>🐽</span>}
                  options={NOSE_COLOR_OPTIONS}
                  value={noseColor}
                  onChange={setNoseColor}
                  placeholder="Seleccionar color de nariz..."
                />

                {/* Patrón de Pelaje */}
                <SearchableEnumSelect
                  label="Patrón de Pelaje"
                  icon={<span>✨</span>}
                  options={COAT_PATTERN_OPTIONS}
                  value={coatPattern}
                  onChange={setCoatPattern}
                  placeholder="Seleccionar patrón..."
                />

                {/* Largo del Pelaje */}
                <div className="sm:col-span-2">
                  <SearchableEnumSelect
                    label="Largo del Pelaje"
                    icon={<span>🦁</span>}
                    options={FUR_LENGTH_OPTIONS}
                    value={furLength}
                    onChange={setFurLength}
                    placeholder="Seleccionar largo de pelo..."
                  />
                </div>
              </div>
            </div>

            {/* Barrio / Ubicación en Cali y Jamundí con Búsqueda Escrita */}
            <div className="relative space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="text-xs font-black text-stone-900 block">
                    {reportType === "LOST"
                      ? "¿Dónde fue vista por última vez? (Punto o Barrio) *"
                      : "¿En qué punto o barrio fue ENCONTRADO/RESCATADO? *"}
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
                  className="text-xs text-emerald-950 hover:text-white font-extrabold flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-700 px-3 py-2 rounded-xl border border-emerald-300 transition shadow-xs flex-shrink-0 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-emerald-700 group-hover:text-white" />
                  <span>📍 Fijar en Mapa / GPS</span>
                </button>
              </div>

              {/* Banner de recomendación para rescates */}
              <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-950 shadow-2xs">
                <MapPin className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="font-extrabold text-amber-950 block text-[11.5px]">
                    💡 Recomendado para rescates más rápidos:
                  </strong>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                    En barrios extensos (ej. <em>Valle del Lili, Meléndez, Ciudad Jardín o Floralia</em>), marcar el <strong>punto exacto en el mapa</strong> permite a la IA calcular la distancia precisa (metros/km) en vez de usar solo el centroide general del barrio.
                  </p>
                </div>
              </div>

              {neighborhood ? (
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
                    className="p-1 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition cursor-pointer"
                    title="Cambiar barrio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
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
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

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
                          className="w-full text-left px-3 py-2.5 hover:bg-amber-50 flex items-center justify-between text-xs transition cursor-pointer"
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
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-extrabold text-white py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition active:scale-[0.98] cursor-pointer"
              >
                <span>Contacto Seguro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Contacto Seguro y Múltiples Contactos */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed shadow-2xs">
              <strong>🛡️ Protección Anti-Extorsión:</strong> Tus números de teléfono nunca serán visibles públicamente en internet. Los rescatistas y dueños deberán verificar una foto con el Triaje Central antes de ser conectados.
            </div>

            {/* Contacto Principal */}
            <div className="space-y-2.5 bg-stone-50 border border-stone-200 rounded-2xl p-3.5">
              <span className="text-[11px] font-extrabold text-stone-800 uppercase tracking-wider block">
                Contacto Principal *
              </span>
              <div>
                <label className="text-[11px] font-bold text-stone-600 mb-1 block">
                  Nombre o Alias Principal
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ej: Familia Gómez / Rescatista Juan"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 mb-1 block">
                  WhatsApp o Teléfono Principal *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ej: 315 123 4567"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contactos Adicionales */}
            {additionalContacts.map((c, idx) => (
              <div key={idx} className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5 relative animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider">
                    Contacto Adicional #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-stone-400 hover:text-rose-600 p-1 transition cursor-pointer"
                    title="Eliminar este contacto adicional"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 font-semibold mb-0.5 block">Nombre / Alias</label>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateContact(idx, "name", e.target.value)}
                      placeholder="Ej: Laura Morales"
                      className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-semibold mb-0.5 block">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      value={c.phone}
                      onChange={(e) => updateContact(idx, "phone", e.target.value)}
                      placeholder="Ej: 310 987 6543"
                      className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Botón para agregar más contactos */}
            <button
              type="button"
              onClick={addContact}
              className="w-full py-2.5 px-3 bg-stone-100 hover:bg-stone-200 border border-dashed border-stone-300 rounded-xl text-stone-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.99]"
            >
              <span>+ Más contactos</span>
            </button>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-[0.98] cursor-pointer"
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

      {/* Duplicate Pet Pre-Check Comparison Modal */}
      {showDuplicateModal && duplicateMatch && (
        <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-stone-200 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-200 pb-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900">¿Esta mascota ya está reportada?</h3>
                <p className="text-xs text-stone-500">
                  Detectamos una alta coincidencia ({duplicateMatch.score}%) en la misma categoría
                </p>
              </div>
            </div>

            {/* Side by side preview */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="space-y-1.5 text-center">
                <span className="text-[11px] font-bold text-stone-700 block">Tu Foto Subida</span>
                <div className="h-36 rounded-xl overflow-hidden bg-white border border-stone-200 flex items-center justify-center p-1">
                  <img
                    src={photoPreview || ""}
                    alt="Uploaded"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <span className="text-[11px] font-bold text-amber-800 block">
                  Existente en Red ({duplicateMatch.pet.id})
                </span>
                <div className="h-36 rounded-xl overflow-hidden bg-white border border-amber-300 flex items-center justify-center p-1">
                  <img
                    src={duplicateMatch.pet.photo_url || "/placeholder-pet.png"}
                    alt="Existing"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Mascota encontrada:</strong> {duplicateMatch.pet.name} ({duplicateMatch.pet.species === "DOG" ? "Perro" : "Gato"}) • {duplicateMatch.pet.neighborhood}
              <br />
              <span className="text-amber-800 text-[11px]">
                {duplicateMatch.pet.distinctive_features}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setStep(2);
                }}
                className="py-3 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                No, es otro caso (Continuar)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  if (onSelectExistingPet) {
                    onSelectExistingPet(duplicateMatch.pet);
                  }
                  onClose();
                }}
                className="py-3 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer"
              >
                ✓ Sí, es este reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal (Top-level z-index) */}
      {rawImageForCrop && (
        <ImageCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Map Location Picker Modal (Top-level z-index) */}
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
  );
}
