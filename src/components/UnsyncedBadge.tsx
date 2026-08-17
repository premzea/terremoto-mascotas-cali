"use client";

import { useEffect, useState } from "react";
import { getPendingReports, removeOfflineReport } from "@/lib/offline-queue";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

export default function UnsyncedBadge() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncedJustNow, setSyncedJustNow] = useState<boolean>(false);

  const checkQueue = async () => {
    try {
      const items = await getPendingReports();
      setPendingCount(items.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkQueue();
    const interval = setInterval(checkQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (pendingCount === 0 || syncing) return;
    setSyncing(true);
    try {
      const items = await getPendingReports();
      let successCount = 0;

      for (const item of items) {
        try {
          const res = await fetch("/api/create-pet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.data),
          });

          const resData = await res.json().catch(() => null);

          if (res.ok && resData?.success) {
            await removeOfflineReport(item.id);
            successCount++;
          } else if (res.status === 400 || !res.ok) {
            console.error(
              `[UnsyncedBadge] Server rejected offline queue item ${item.id} (Status ${res.status}):`,
              resData
            );
          }
        } catch (postErr) {
          console.warn(`[UnsyncedBadge] Network unreachable for item ${item.id}:`, postErr);
        }
      }

      const remaining = await getPendingReports();
      setPendingCount(remaining.length);

      if (successCount > 0 && remaining.length === 0) {
        setSyncedJustNow(true);
        setTimeout(() => setSyncedJustNow(false), 4000);
      }
    } catch (err) {
      console.error("Sync error in UnsyncedBadge:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (syncedJustNow) {
    return (
      <div className="bg-emerald-600 text-white font-bold py-2.5 px-4 text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
        <CheckCircle2 className="w-5 h-5 animate-bounce" />
        <span>¡Reportes sincronizados con la red de emergencia!</span>
      </div>
    );
  }

  if (pendingCount === 0) return null;

  return (
    <div
      onClick={handleManualSync}
      className="badge-offline flex items-center justify-between text-sm active:opacity-90"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>
          <strong>{pendingCount} {pendingCount === 1 ? "foto/reporte pendiente" : "fotos/reportes pendientes"} de subir</strong> (Modo Sin Señal)
        </span>
      </div>
      <button
        disabled={syncing}
        className="bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Sincronizando..." : "Toca aquí para sincronizar"}
      </button>
    </div>
  );
}
