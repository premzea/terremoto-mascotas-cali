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
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141417] border border-neutral-800 w-full max-w-md rounded-2xl p-6 text-white overflow-hidden shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-4">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Cerrar Caso de Mascota</h3>
            <p className="text-xs text-neutral-400">Acceso exclusivo de administración</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-white">¡Caso Cerrado Exitosamente!</h4>
            <p className="text-xs text-neutral-400">
              La mascota ha sido marcada como reunida y retirada de la lista activa.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
              <p>
                Mascota: <strong className="text-white">{pet.name}</strong> (ID: <span className="font-mono text-amber-400">{pet.id}</span>)
              </p>
              <p className="text-neutral-400">
                Ingresa el código maestro de administración para marcar este caso como resuelto/reunido.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-2">
                Código Maestro de Admin:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Ingresa el código maestro..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !passcode.trim()}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
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
