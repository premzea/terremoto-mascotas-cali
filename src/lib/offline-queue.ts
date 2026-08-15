import { openDB, DBSchema, IDBPDatabase } from "idb";
import { OfflineQueueItem, PetReport } from "./types";

interface PetDB extends DBSchema {
  offlineReports: {
    key: string;
    value: OfflineQueueItem;
  };
  cachedPets: {
    key: string;
    value: PetReport;
  };
}

const DB_NAME = "cali_mascotas_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PetDB>> | null = null;

export function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<PetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("offlineReports")) {
          db.createObjectStore("offlineReports", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("cachedPets")) {
          db.createObjectStore("cachedPets", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveOfflineReport(report: PetReport, photoBlob?: Blob): Promise<string> {
  const db = await getDB();
  if (!db) return "";
  
  const id = report.id || `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const item: OfflineQueueItem = {
    id,
    data: { ...report, id },
    photoBlob,
    timestamp: Date.now(),
    status: "PENDING",
  };
  
  await db.put("offlineReports", item);
  return id;
}

export async function getPendingReports(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("offlineReports");
}

export async function removeOfflineReport(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete("offlineReports", id);
}

export async function cachePetsLocally(pets: PetReport[]): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction("cachedPets", "readwrite");
  for (const pet of pets) {
    await tx.store.put(pet);
  }
  await tx.done;
}

export async function getCachedPets(): Promise<PetReport[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("cachedPets");
}
