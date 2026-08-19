"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import { KeyRound, Edit3, Send, CheckCircle2, AlertCircle, Loader2, X, Sparkles } from "lucide-react";

interface EditPetModalProps {
  pet: PetReport;
  onClose: () => void;
  onSuccess: (updatedPet: PetReport) => void;
}

export default function EditPetModal({ pet, onClose, onSuccess }: EditPetModalProps) {
  const [passcode, setPasscode] = useState<string>("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Editable Form Fields (Unlocked Mode)
  const [name, setName] = useState<string>(pet.name || "");
  const [species, setSpecies] = useState<"DOG" | "CAT" | "OTHER">(pet.species || "DOG");
  const [gender, setGender] = useState<"MACHO" | "HEMBRA" | "UNKNOWN">(pet.gender || "UNKNOWN");
  const [size, setSize] = useState<"PEQUEÑO" | "MEDIANO" | "GRANDE">(pet.size || "MEDIANO");
  const [primaryColor, setPrimaryColor] = useState<string>(pet.primary_color || "");
  const [neighborhood, setNeighborhood] = useState<string>(pet.neighborhood || "");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState<string>(pet.distinctive_features || "");
  const [contactName, setContactName] = useState<string>(pet.contact_name || "");
  const [contactPhone, setContactPhone] = useState<string>(pet.contact_phone || "");

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Suggestion Fallback (No Code Mode)
  const [suggestion, setSuggestion] = useState<string>("");
  const [requesterContact, setRequesterContact] = useState<string>("");
  const [sendingSuggestion, setSendingSuggestion] = useState<boolean>(false);
  const [suggestionSent, setSuggestionSent] = useState<boolean>(false);

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
      // Test code verification by dummy test call or direct match
      const res = await fetch("/api/edit-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet.id,
          passcode: passcode.trim(),
          updatedFields: { name: name.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
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

    const updatedFields = {
      name: name.trim(),
      species,
      gender,
      size,
      primary_color: primaryColor.trim(),
      neighborhood: neighborhood.trim(),
      distinctive_features: distinctiveFeatures.trim(),
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
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
      console.error("Error sending edit suggestion email:", err);
    } finally {
      setSendingSuggestion(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl p-5 sm:p-6 text-stone-900 max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition cursor-pointer"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-200 pb-3 mb-4">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
            <Edit3 className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Editar Reporte de Mascota</h3>
            <p className="text-xs text-stone-500">
              {pet.name} • ID: <span className="font-mono font-bold text-amber-800">{pet.id}</span>
            </p>
          </div>
        </div>

        {/* UNLOCKED MODE: Live Form Editor */}
        {isUnlocked ? (
          <div>
            {saveSuccess ? (
              <div className="text-center py-6 space-y-2 animate-fade-in">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-stone-900">¡Reporte Actualizado!</h4>
                <p className="text-xs text-stone-600">
                  Los cambios han sido guardados exitosamente en la red de búsqueda.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveUpdates} className="space-y-3.5 animate-fade-in">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Acceso de edición verificado con código maestro</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Nombre</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Barrio / Punto</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Especie</label>
                    <select
                      value={species}
                      onChange={(e) => setSpecies(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-2 text-xs"
                    >
                      <option value="DOG">Perro</option>
                      <option value="CAT">Gato</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Sexo</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-2 text-xs"
                    >
                      <option value="MACHO">Macho</option>
                      <option value="HEMBRA">Hembra</option>
                      <option value="UNKNOWN">No sabe</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Tamaño</label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-2 text-xs"
                    >
                      <option value="PEQUEÑO">Pequeño</option>
                      <option value="MEDIANO">Mediano</option>
                      <option value="GRANDE">Grande</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 mb-1 block">
                    Descripción y Rasgos Particulares
                  </label>
                  <textarea
                    value={distinctiveFeatures}
                    onChange={(e) => setDistinctiveFeatures(e.target.value)}
                    rows={3}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Contacto Nombre</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 mb-1 block">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-[0.98] cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* LOCKED MODE: Enter Master Code OR Send Suggestion */
          <div className="space-y-5">
            {/* Formulario de Código Maestro */}
            <form onSubmit={handleVerifyPasscode} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Ingresa el Código Maestro para editar directamente:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Código de administración..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-amber-500"
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
                className="w-full bg-stone-900 hover:bg-black disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Desbloquear Edición</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-semibold uppercase">
                O si eres ciudadano / voluntario
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            {/* Cuadro de sugerencias de cambio para ciudadanos sin código */}
            {suggestionSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5 animate-fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-xs text-emerald-900">¡Sugerencia Enviada!</h4>
                <p className="text-[11px] text-emerald-700">
                  Nuestro equipo de triaje revisará tu sugerencia y actualizará la ficha. ¡Gracias por ayudar!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSuggestion} className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    ¿No tienes el código maestro? Sugiere una corrección:
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Si notas algún dato desactualizado (ej: la mascota cambió de barrio, tiene un rasgo no mencionado o ya está a salvo), escríbelo aquí y nuestro equipo revisará y aplicará los cambios:
                  </p>
                </div>

                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  rows={3}
                  required
                  placeholder="Escribe aquí los cambios o correcciones que deseas sugerir..."
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />

                <div>
                  <input
                    type="text"
                    value={requesterContact}
                    onChange={(e) => setRequesterContact(e.target.value)}
                    placeholder="Tu teléfono o WhatsApp (opcional, para contactarte)"
                    className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingSuggestion || !suggestion.trim()}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  {sendingSuggestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar Sugerencia de Cambio</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
