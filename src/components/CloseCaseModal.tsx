"use client";

import { useState } from "react";
import { PetReport } from "@/lib/types";
import { ShieldCheck, X, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

interface CloseCaseModalProps {
  pet: PetReport;
  onClose: () => void;
  onSuccess: (petId: string) => void;
}

export default function CloseCaseModal({ pet, onClose, onSuccess }: CloseCaseModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [passcode, setPasscode] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Por favor ingresa el código maestro de administrador.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/close-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet.id,
          petName: pet.name,
          passcode: passcode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Código incorrecto.");
      }

      setSuccess(true);
      setTimeout(() => {
        if (pet.id) {
          onSuccess(pet.id);
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al verificar el código maestro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl p-6 text-stone-900 overflow-hidden shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-200 pb-4 mb-4">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Cerrar Caso de Mascota</h3>
            <p className="text-xs text-stone-500">Acceso exclusivo de administración</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-stone-900">¡Caso Cerrado Exitosamente!</h4>
            <p className="text-xs text-stone-600">
              La mascota ha sido marcada como reunida y retirada de la lista activa.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
              <p>
                Mascota: <strong className="text-stone-900">{pet.name}</strong> (ID: <span className="font-mono text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">{pet.id}</span>)
              </p>
              <p className="text-stone-500">
                Ingresa el código maestro de administración para marcar este caso como resuelto/reunido.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">
                Código Maestro de Admin:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Ingresa el código maestro..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !passcode.trim()}
                className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirmar Cierre</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
