"use client";

import { useState, useMemo, useRef } from "react";
import { PetReport } from "@/lib/types";
import {
  KeyRound,
  Edit3,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  MapPin,
  Camera,
  Upload,
  Check,
  User,
  Phone,
  Trash2,
} from "lucide-react";
import barrioCoords from "@/data/coords_by_barrio.json";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";
import MapLocationPicker from "./MapLocationPicker";
import SearchableBreedSelect from "./SearchableBreedSelect";
import SearchableEnumSelect, { EnumOption } from "./SearchableEnumSelect";

interface EditPetModalProps {
  pet: PetReport;
  onClose: () => void;
  onSuccess: (updatedPet: PetReport) => void;
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

function parseInitialColors(colorStr?: string): string[] {
  if (!colorStr) return [];
  const norm = normalizeText(colorStr);
  const found: string[] = [];
  if (norm.includes("negro") || norm.includes("black")) found.push("BLACK");
  if (norm.includes("blanco") || norm.includes("white")) found.push("WHITE");
  if (norm.includes("cafe") || norm.includes("marron") || norm.includes("brown")) found.push("BROWN");
  if (norm.includes("dorado") || norm.includes("amarillo") || norm.includes("golden") || norm.includes("yellow")) found.push("GOLDEN_YELLOW");
  if (norm.includes("naranja") || norm.includes("rojo") || norm.includes("orange") || norm.includes("red")) found.push("ORANGE_RED");
  if (norm.includes("gris") || norm.includes("plata") || norm.includes("gray") || norm.includes("silver")) found.push("GRAY_SILVER");
  if (norm.includes("crema") || norm.includes("beige") || norm.includes("cream")) found.push("CREAM");
  return found;
}

export default function EditPetModal({ pet, onClose, onSuccess }: EditPetModalProps) {
  const [passcode, setPasscode] = useState<string>("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Retrieve cached visual features if available
  const v2Cache = (visualFeaturesV2 as unknown) as Record<string, any>;
  const cachedV2 = v2Cache[pet.id || ""] || {};

  // Form Fields (Unlocked Mode)
  const [name, setName] = useState<string>(pet.name || "");
  const [species, setSpecies] = useState<"DOG" | "CAT" | "OTHER">(pet.species || "DOG");
  const [gender, setGender] = useState<"MACHO" | "HEMBRA" | "UNKNOWN">(pet.gender || "UNKNOWN");
  const [isNeutered, setIsNeutered] = useState<"YES" | "NO" | "UNKNOWN">(
    (pet.distinctive_features || "").toLowerCase().includes("macho castrado")
      ? "YES"
      : (pet.distinctive_features || "").toLowerCase().includes("sin castrar")
      ? "NO"
      : "UNKNOWN"
  );
  const [breed, setBreed] = useState<string>(
    (pet.distinctive_features || "").match(/Raza:\s*([^.]+)/i)?.[1]?.trim() || ""
  );
  const [size, setSize] = useState<"PEQUEÑO" | "MEDIANO" | "GRANDE">(pet.size || "MEDIANO");

  // 6 Visual Characteristics
  const [selectedColors, setSelectedColors] = useState<string[]>(
    parseInitialColors(pet.primary_color)
  );
  const [earType, setEarType] = useState<string>(cachedV2.ear_type || "UNKNOWN");
  const [eyeColor, setEyeColor] = useState<string>(cachedV2.eye_color || "UNKNOWN");
  const [noseColor, setNoseColor] = useState<string>(cachedV2.nose_color || "UNKNOWN");
  const [coatPattern, setCoatPattern] = useState<string>(pet.pattern || cachedV2.coat_pattern || "UNKNOWN");
  const [furLength, setFurLength] = useState<string>(cachedV2.fur_length || "UNKNOWN");

  // Barrio Search & Map State
  const [neighborhood, setNeighborhood] = useState<string>(pet.neighborhood || "");
  const [barrioSearch, setBarrioSearch] = useState<string>(pet.neighborhood || "");
  const [showBarrioSuggestions, setShowBarrioSuggestions] = useState<boolean>(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>(pet.lat || undefined);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(pet.lng || undefined);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);

  const [distinctiveFeatures, setDistinctiveFeatures] = useState<string>(pet.distinctive_features || "");

  // Multiple Contacts Parsing
  const initialNames = (pet.contact_name || "").split(" / ");
  const initialPhones = (pet.contact_phone || "").split(" / ");
  const [contactName, setContactName] = useState<string>(initialNames[0] || "");
  const [contactPhone, setContactPhone] = useState<string>(initialPhones[0] || "");
  const [additionalContacts, setAdditionalContacts] = useState<Array<{ name: string; phone: string }>>(
    initialNames.slice(1).map((n, i) => ({ name: n, phone: initialPhones[i + 1] || "" }))
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Suggestion Fallback (No Code Mode)
  const [suggestion, setSuggestion] = useState<string>("");
  const [requesterContact, setRequesterContact] = useState<string>("");
  const [sendingSuggestion, setSendingSuggestion] = useState<boolean>(false);
  const [suggestionSent, setSuggestionSent] = useState<boolean>(false);

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

  // 1. Verify Passcode
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setPassError("Por favor ingresa el código de administrador.");
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
        throw new Error(data.error || "Código maestro incorrecto.");
      }

      setIsUnlocked(true);
    } catch (err: any) {
      setPassError(err.message || "Código incorrecto.");
    } finally {
      setVerifying(false);
    }
  };

  // 2. Save Full Updates (Unlocked Mode)
  const handleSaveUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setPassError(null);

    // Convert selected color IDs to Spanish string
    const computedColorString = selectedColors.length > 0
      ? selectedColors.map((c) => COLOR_NAME_MAP[c] || c).join(", ")
      : pet.primary_color || "Deducido por IA";

    // Merge multiple contacts into database columns
    const allValidPhones = [contactPhone.trim(), ...additionalContacts.map((c) => c.phone.trim())].filter(Boolean);
    const allValidNames = [contactName.trim(), ...additionalContacts.map((c) => c.name.trim())].filter(Boolean);

    const finalPhone = allValidPhones.join(" / ") || contactPhone.trim();
    const finalName = allValidNames.join(" / ") || contactName.trim();

    const updatedFields = {
      name: name.trim() || (pet.report_type === "LOST" ? "Sin nombre" : "Rescatado"),
      species,
      gender,
      size,
      primary_color: computedColorString,
      pattern: coatPattern !== "UNKNOWN" ? coatPattern : "",
      neighborhood: neighborhood.trim() || barrioSearch.trim() || "Cali Centro (General)",
      lat: selectedLat !== undefined ? selectedLat : pet.lat,
      lng: selectedLng !== undefined ? selectedLng : pet.lng,
      distinctive_features: distinctiveFeatures.trim(),
      contact_name: finalName,
      contact_phone: finalPhone,
    };

    try {
      const res = await fetch("/api/edit-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet.id,
          passcode: passcode.trim(),
          updatedFields,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la actualización.");
      }

      setSaveSuccess(true);
      const updatedPetObj: PetReport = {
        ...pet,
        ...updatedFields,
      };

      setTimeout(() => {
        onSuccess(updatedPetObj);
        onClose();
      }, 1200);
    } catch (err: any) {
      setPassError(err.message || "Error al actualizar.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Send Suggestion Email (No Code Mode)
  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setSendingSuggestion(true);
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EDIT_REQUEST",
          data: {
            pet,
            suggestedChanges: suggestion.trim(),
            requesterContact: requesterContact.trim(),
          },
        }),
      });

      setSuggestionSent(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error sending suggestion email:", err);
    } finally {
      setSendingSuggestion(false);
    }
  };

  const isLost = pet.report_type === "LOST";

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
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl border border-amber-300 shadow-2xs">
            <Edit3 className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Editar Reporte de Mascota</h3>
            <p className="text-xs text-stone-500">
              ID: <span className="font-mono font-bold text-amber-800">{pet.id}</span> • {pet.name} (
              {isLost ? "Buscada" : "Rescatada"})
            </p>
          </div>
        </div>

        {/* UNLOCKED MODE: Comprehensive Form Matching Registration Style */}
        {isUnlocked ? (
          <form onSubmit={handleSaveUpdates} className="space-y-4 animate-fade-in text-xs">
            {saveSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1.5 animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900">¡Reporte Actualizado con Éxito!</h4>
                <p className="text-xs text-emerald-700">Los cambios se han guardado en la base de datos.</p>
              </div>
            ) : (
              <>
                {/* 1. Especie */}
                <div>
                  <label className="text-xs font-bold text-stone-700 mb-1.5 block">Especie *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSpecies("DOG")}
                      className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
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
                      className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
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
                      className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        species === "OTHER"
                          ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs font-extrabold"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      ❓ No sé / Otro
                    </button>
                  </div>
                </div>

                {/* 2. Nombre, Sexo y Tamaño (Manual) */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Nombre</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isLost ? "Ej: Dakota" : "Desconocido"}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Sexo</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none font-medium"
                    >
                      <option value="UNKNOWN">No se sabe</option>
                      <option value="MACHO">Macho</option>
                      <option value="HEMBRA">Hembra</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Tamaño *</label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-amber-800 focus:bg-white focus:border-amber-500 focus:outline-none font-bold"
                    >
                      <option value="PEQUEÑO">Pequeño</option>
                      <option value="MEDIANO">Mediano</option>
                      <option value="GRANDE">Grande</option>
                    </select>
                  </div>
                </div>

                {/* Castrado si es macho */}
                {gender === "MACHO" && (
                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-1.5 shadow-2xs">
                    <label className="text-xs font-bold text-amber-900 block">¿Macho Castrado / Esterilizado?</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsNeutered("NO")}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
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
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
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
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
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

                {/* Raza con Selector Inteligente */}
                <SearchableBreedSelect species={species} value={breed} onChange={setBreed} />

                {/* 3. Características Visuales (Colores y Enums) */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rasgos Visuales y Morfología:</span>
                  </div>

                  {/* Colores de Pelaje */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-700 block">🎨 Colores de Pelaje:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PALETTE.map((color) => {
                        const isSelected = selectedColors.includes(color.id);
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => {
                              setSelectedColors((prev) =>
                                isSelected ? prev.filter((c) => c !== color.id) : [...prev, color.id]
                              );
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

                  {/* 5 Selectores Enums con Buscador */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                    <SearchableEnumSelect
                      label="Tipo de Orejas"
                      icon={<span>🔺</span>}
                      options={EAR_TYPE_OPTIONS}
                      value={earType}
                      onChange={setEarType}
                    />
                    <SearchableEnumSelect
                      label="Color de Ojos"
                      icon={<span>👁️</span>}
                      options={EYE_COLOR_OPTIONS}
                      value={eyeColor}
                      onChange={setEyeColor}
                    />
                    <SearchableEnumSelect
                      label="Color de Nariz / Trufa"
                      icon={<span>🐽</span>}
                      options={NOSE_COLOR_OPTIONS}
                      value={noseColor}
                      onChange={setNoseColor}
                    />
                    <SearchableEnumSelect
                      label="Patrón de Pelaje"
                      icon={<span>✨</span>}
                      options={COAT_PATTERN_OPTIONS}
                      value={coatPattern}
                      onChange={setCoatPattern}
                    />
                    <div className="sm:col-span-2">
                      <SearchableEnumSelect
                        label="Largo del Pelaje"
                        icon={<span>🦁</span>}
                        options={FUR_LENGTH_OPTIONS}
                        value={furLength}
                        onChange={setFurLength}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Ubicación en Mapa Interactivo y Barrio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-900 block">
                      {isLost ? "Ubicación donde se perdió *" : "Ubicación donde fue rescatada *"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="text-xs text-emerald-950 hover:text-white font-extrabold flex items-center gap-1 bg-emerald-100 hover:bg-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-300 transition shadow-2xs cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>📍 Fijar en Mapa / GPS</span>
                    </button>
                  </div>

                  {neighborhood ? (
                    <div className="bg-amber-50/80 border border-amber-300 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div>
                          <strong className="text-stone-900 text-xs block font-bold">{neighborhood}</strong>
                          {selectedLat && selectedLng && (
                            <span className="text-[10px] text-stone-500">
                              GPS: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNeighborhood("");
                          setBarrioSearch("");
                        }}
                        className="text-amber-800 hover:text-amber-950 text-xs font-bold underline cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={barrioSearch}
                        onChange={(e) => {
                          setBarrioSearch(e.target.value);
                          setShowBarrioSuggestions(true);
                        }}
                        onFocus={() => setShowBarrioSuggestions(true)}
                        placeholder="Escribe el barrio de Cali o Jamundí..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                      />
                      {showBarrioSuggestions && matchingBarrios.length > 0 && (
                        <div className="absolute left-0 right-0 top-11 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto divide-y divide-stone-100">
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
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center justify-between text-xs transition cursor-pointer"
                            >
                              <span className="font-bold text-stone-900">{b.name}</span>
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border">
                                {b.zone || `Comuna ${b.comuna}`}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Contactos Responsables */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                    <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Contactos Responsables:</span>
                    </div>
                    <button
                      type="button"
                      onClick={addContact}
                      className="text-[11px] bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg font-bold text-stone-700 transition cursor-pointer"
                    >
                      + Agregar otro contacto
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 mb-1 block">Nombre Contacto Principal</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Ej: Laura Morales"
                        className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 mb-1 block">Teléfono / WhatsApp Principal</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Ej: 310 987 6543 (o NA)"
                        className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {additionalContacts.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-stone-200 rounded-xl space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500">Contacto Secundario #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateContact(idx, "name", e.target.value)}
                          placeholder="Nombre adicional"
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:bg-white"
                        />
                        <input
                          type="text"
                          value={c.phone}
                          onChange={(e) => updateContact(idx, "phone", e.target.value)}
                          placeholder="Teléfono adicional"
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 6. Descripción y Notas */}
                <div>
                  <label className="text-xs font-bold text-stone-700 mb-1 block">Descripción y Notas:</label>
                  <textarea
                    value={distinctiveFeatures}
                    onChange={(e) => setDistinctiveFeatures(e.target.value)}
                    rows={3}
                    placeholder="Descripción, rasgos o lugar de resguardo..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>

                {passError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{passError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          /* LOCKED MODE: Enter Master Code OR Suggest Changes */
          <div className="space-y-5">
            <form onSubmit={handleVerifyPasscode} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Ingresa el Código Maestro de administración para editar:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Código de administración..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-amber-500 shadow-2xs"
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
                <span>Desbloquear Edición con Código</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-semibold uppercase">
                O sugiere una corrección ciudadana
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            {suggestionSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5 animate-fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-xs text-emerald-900">¡Sugerencia Enviada!</h4>
                <p className="text-[11px] text-emerald-700">
                  El equipo de triaje revisará y actualizará la información del reporte a la brevedad.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSuggestion} className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5 mb-1">
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    ¿Quieres corregir un dato de esta mascota?
                  </h4>
                  <p className="text-[11px] text-amber-900 leading-snug">
                    Si no tienes código maestro pero notas un error (ej. barrio, teléfono o características), escribe los cambios aquí y los aplicaremos:
                  </p>
                </div>

                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  rows={3}
                  required
                  placeholder="Describe los datos que se deben corregir o agregar..."
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />

                <div>
                  <input
                    type="text"
                    value={requesterContact}
                    onChange={(e) => setRequesterContact(e.target.value)}
                    required
                    placeholder="Tu nombre y teléfono / WhatsApp para verificar *"
                    className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingSuggestion || !suggestion.trim()}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  {sendingSuggestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar Sugerencia al Triaje</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Map Location Picker Modal inside Edit Modal */}
        {showMapPicker && (
          <MapLocationPicker
            initialBarrio={neighborhood}
            initialLat={selectedLat}
            initialLng={selectedLng}
            onSelectLocation={(loc) => {
              setNeighborhood(loc.neighborhood);
              setBarrioSearch(loc.neighborhood);
              setSelectedLat(loc.lat);
              setSelectedLng(loc.lng);
              setShowMapPicker(false);
            }}
            onClose={() => setShowMapPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
