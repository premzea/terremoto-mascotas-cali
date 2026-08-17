import seedPets from "@/data/seed_pets.json";
import { PetReport } from "./types";
import { supabase } from "./supabase";
import { getPendingReports, removeOfflineReport } from "./offline-queue";

export const LOCAL_CREATED_PETS_KEY = "CALI_USER_CREATED_PETS";

function cleanupLegacyStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_CREATED_PETS_KEY);
  } catch (err) {
    console.warn("Storage cleanup error:", err);
  }
}

export async function getPets(filters?: {
  species?: string;
  report_type?: string;
  neighborhood?: string;
  search?: string;
}): Promise<PetReport[]> {
  cleanupLegacyStorage();
  let baseList: PetReport[] = [];

  // 1. First attempt: fetch from server route /api/pets
  try {
    const params = new URLSearchParams();
    if (filters?.species) params.set("species", filters.species);
    if (filters?.report_type) params.set("report_type", filters.report_type);
    if (filters?.neighborhood) params.set("neighborhood", filters.neighborhood);
    if (filters?.search) params.set("search", filters.search);

    const res = await fetch(`/api/pets?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data?.success && Array.isArray(data?.pets) && data.pets.length > 0) {
      baseList = data.pets;
    }
  } catch (apiErr) {
    console.warn("Could not fetch from /api/pets, trying Supabase direct client:", apiErr);
  }

  // 2. Second attempt: Direct Supabase client query
  if (baseList.length === 0 && supabase) {
    try {
      let query = supabase
        .from("pets")
        .select("*")
        .neq("status", "CLOSED")
        .neq("status", "REUNITED")
        .order("created_at", { ascending: false });

      if (filters?.species && filters.species !== "ALL") {
        query = query.eq("species", filters.species);
      }
      if (filters?.report_type && filters.report_type !== "ALL") {
        query = query.eq("report_type", filters.report_type);
      }
      if (filters?.neighborhood && filters.neighborhood !== "ALL") {
        query = query.ilike("neighborhood", `%${filters.neighborhood}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        baseList = data as PetReport[];
      }
    } catch (sbErr) {
      console.warn("Supabase direct query error:", sbErr);
    }
  }

  // 3. Third attempt: Static fallback seed
  if (baseList.length === 0) {
    baseList = (seedPets as PetReport[]).filter(
      (p) => p.status !== "CLOSED" && p.status !== "REUNITED"
    );
  }

  // 4. Retrieve local offline queue and localStorage items on this browser
  let localOfflineOnlyPets: PetReport[] = [];
  if (typeof window !== "undefined") {
    const serverIds = new Set(baseList.map((p) => p.id));

    // Reconcile localStorage against authoritative server records
    if (baseList.length > 0) {
      const rawLocal = localStorage.getItem(LOCAL_CREATED_PETS_KEY);
      if (rawLocal) {
        try {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((p: any) => {
              if (!p || !p.id) return false;
              // If it's a server ID (B... or R...) and NOT in server list, it's purged
              if (/^[BR]\d+$/i.test(p.id) && !serverIds.has(p.id)) return false;
              return p.status !== "CLOSED" && p.status !== "REUNITED";
            });
            localStorage.setItem(LOCAL_CREATED_PETS_KEY, JSON.stringify(cleaned));
          }
        } catch (e) {
          console.warn("Reconciliation warning:", e);
        }
      }
    }

    // From IndexedDB: purge ghost deleted server IDs and keep only truly pending offline items
    try {
      const pendingItems = await getPendingReports();
      for (const item of pendingItems) {
        const itemId = item.data?.id || item.id;
        // If it's a server ID (B... or R...) that either already exists on server or was deleted, remove from offline queue
        if (/^[BR]\d+$/i.test(itemId)) {
          await removeOfflineReport(item.id);
        } else if (item.data && item.data.status !== "CLOSED" && item.data.status !== "REUNITED") {
          localOfflineOnlyPets.push(item.data);
        }
      }
    } catch (idbErr) {
      console.warn("IndexedDB reconciliation warning:", idbErr);
    }
  }

  // 5. Merge all sources: authoritative live baseList from server FIRST, then pending offline items
  const seenIds = new Set<string>();
  const merged: PetReport[] = [];

  // 1. Authoritative server records first
  for (const pet of baseList) {
    if (pet && pet.id && !seenIds.has(pet.id) && pet.status !== "CLOSED" && pet.status !== "REUNITED") {
      seenIds.add(pet.id);
      merged.push(pet);
    }
  }

  // 2. Add only genuine pending offline items that have no server ID yet
  for (const pet of localOfflineOnlyPets) {
    if (pet && pet.id && !seenIds.has(pet.id) && pet.status !== "CLOSED" && pet.status !== "REUNITED") {
      seenIds.add(pet.id);
      merged.unshift(pet);
    }
  }

  // 6. Apply search and species filters
  let list = merged;

  if (filters?.species && filters.species !== "ALL") {
    list = list.filter((p) => p.species === filters.species);
  }
  if (filters?.report_type && filters.report_type !== "ALL") {
    list = list.filter((p) => p.report_type === filters.report_type);
  }
  if (filters?.neighborhood && filters.neighborhood !== "ALL") {
    list = list.filter((p) =>
      p.neighborhood.toLowerCase().includes(filters.neighborhood!.toLowerCase())
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.primary_color.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        (p.distinctive_features && p.distinctive_features.toLowerCase().includes(q))
    );
  }

  return list;
}

export const CENTRAL_TRIAGE_WHATSAPP = "573182887344"; // Central triage coordination line for Cali crisis
