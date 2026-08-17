"use client";

import { useState, useMemo } from "react";
import { PetReport } from "@/lib/types";
import { saveOfflineReport } from "@/lib/offline-queue";
import { Camera, Upload, ArrowRight, ArrowLeft, Check, X, Loader2, Sparkles, MapPin } from "lucide-react";
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
            const data = await res.json();
            if (data?.success && data?.traits) {
              const t = data.traits;
              if (t.species === "DOG" || t.species === "CAT") {
                setSpecies(t.species);
              }
              if (t.primary_color) {
                setPrimaryColor(t.primary_color);
              }
              if (t.breed_likely) {
                setBreed(t.breed_likely);
              }
              if (t.search_summary) {
                setDistinctiveFeatures(t.search_summary);
              } else if (t.distinctive_marks) {
                setDistinctiveFeatures(t.distinctive_marks);
              }
              setAiDetected(t.search_summary || `${t.breed_likely || ""} (${t.primary_color || ""})`);
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

      // Build structured features including breed and castration status
      let assembledFeatures = distinctiveFeatures.trim();
      if (breed.trim()) {
        assembledFeatures = `Raza: ${breed.trim()}. ${assembledFeatures}`;
      }
      if (gender === "MACHO" && isNeutered !== "UNKNOWN") {
        assembledFeatures = `${isNeutered === "YES" ? "Macho Castrado" : "Macho Sin Castrar"}. ${assembledFeatures}`;
      }

      const newPet: PetReport = {
        id: generatedId,
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

      // 1. Guardar en Supabase a través del backend Server API /api/create-pet
      let createdPet = newPet;
      try {
        const res = await fetch("/api/create-pet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPet),
        });
        const resData = await res.json();
        if (resData?.success && resData?.pet) {
          createdPet = resData.pet;
        }
      } catch (apiErr) {
        console.warn("Could not reach /api/create-pet, saving locally:", apiErr);
      }

      // 2. Persistir en localStorage del dispositivo (permanencia garantizada ante recargas)
      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(LOCAL_CREATED_PETS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const updated = [createdPet, ...list.filter((p: any) => p && p.id !== createdPet.id)];
          localStorage.setItem(LOCAL_CREATED_PETS_KEY, JSON.stringify(updated));
        }
      } catch (lsErr) {
        console.warn("localStorage write error:", lsErr);
      }

      // 3. Guardar en la cola local de IndexedDB (Resiliencia Offline)
      await saveOfflineReport(createdPet, photoBlob || undefined);

      // 4. Notificar por correo a busquedanimalcali@gmail.com
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "NEW_REPORT",
            data: { pet: createdPet },
          }),
        });
      } catch (emailErr) {
        console.warn("Could not dispatch registration email:", emailErr);
      }
      
      onSuccess(createdPet);
      onClose();
    } catch (e) {
      console.error("handleFinish error:", e);
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
              La fotografía es la clave para que la Inteligencia Artificial deduzca automáticamente los colores del pelaje, la raza y compare la mascota.
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
                      <span>IA deduciendo colores, especie y raza...</span>
                    </div>
                  )}
                  {aiDetected && !analyzingAi && (
                    <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-center mt-1">
                      ✨ Detectado por IA: {aiDetected}
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
                      Subir o Tomar Foto del Animal
                    </span>
                    <span className="text-xs text-neutral-400 block mt-1">
                      Toca aquí para seleccionar de tu galería o cámara
                    </span>
                  </div>
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full border border-neutral-700">
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
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
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
              <label className="text-xs font-bold text-neutral-400 mb-1.5 block">
                Especie *
              </label>
              <div className="grid grid-cols-3 gap-2">
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
                <button
                  type="button"
                  onClick={() => setSpecies("OTHER")}
                  className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    species === "OTHER"
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400"
                  }`}
                >
                  🐾 Otro
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

            {/* Pregunta si está castrado en caso de ser MACHO */}
            {gender === "MACHO" && (
              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-amber-300 block">
                  ¿El macho está castrado / esterilizado? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNeutered("NO")}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      isNeutered === "NO"
                        ? "bg-red-600 text-white border-red-500 shadow"
                        : "bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-white"
                    }`}
                  >
                    No (Sin castrar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNeutered("YES")}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      isNeutered === "YES"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow"
                        : "bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Sí (Castrado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNeutered("UNKNOWN")}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      isNeutered === "UNKNOWN"
                        ? "bg-amber-500 text-black border-amber-400 font-extrabold shadow"
                        : "bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-white"
                    }`}
                  >
                    No se sabe
                  </button>
                </div>
              </div>
            )}

            {/* Raza de la Mascota */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 block">
                Raza de la Mascota *
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Ej: Criollo / Mestizo, Pitbull, Poodle, Labrador, Siamés..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {["Criollo / Mestizo", "Pitbull", "Poodle / Caniche", "Labrador", "Pinscher", "Siamés"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBreed(r)}
                    className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-700 transition"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Color de Pelaje Deducido por la Máquina */}
            <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Color del pelaje (IA):
              </span>
              <strong className="text-amber-300 font-bold">
                {primaryColor || "Deducido automáticamente de la foto"}
              </strong>
            </div>

            {/* Barrio / Ubicación en Cali y Jamundí con Búsqueda Escrita */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-400">
                  Ubicación / Barrio en Cali o Jamundí *
                </label>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>📍 Abrir Mapa / GPS</span>
                </button>
              </div>

              {neighborhood ? (
                /* Barrio ya seleccionado */
                <div className="bg-neutral-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <strong className="text-white text-xs block">{neighborhood}</strong>
                      {selectedLat && (
                        <span className="text-[10px] text-neutral-400">
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
                    className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                    title="Cambiar barrio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Buscador de barrio */
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={barrioSearch}
                    onChange={(e) => {
                      setBarrioSearch(e.target.value);
                      setShowBarrioSuggestions(true);
                    }}
                    onFocus={() => setShowBarrioSuggestions(true)}
                    placeholder="Escribe el barrio (Ej: Nápoles, Valle del Lili, Alfaguara...)"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                  />
                  {barrioSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarrioSearch("");
                        setShowBarrioSuggestions(false);
                      }}
                      className="absolute right-3 top-3 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Sugerencias de Autocompletado de Barrios */}
                  {showBarrioSuggestions && matchingBarrios.length > 0 && (
                    <div className="absolute left-0 right-0 top-12 bg-[#19191e] border border-neutral-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
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
                          className="w-full text-left px-3 py-2.5 hover:bg-neutral-800 border-b border-neutral-800/80 last:border-0 flex items-center justify-between text-xs transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="font-bold text-white">{b.name}</span>
                          </div>
                          <span className="text-[10px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
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
