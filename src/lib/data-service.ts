import seedPets from "@/data/seed_pets.json";
import { PetReport } from "./types";
import { supabase } from "./supabase";
import { getPendingReports } from "./offline-queue";

export const LOCAL_CREATED_PETS_KEY = "CALI_USER_CREATED_PETS";

function getLocallyCreatedPets(): PetReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CREATED_PETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((p: any) => p && p.status !== "CLOSED" && p.status !== "REUNITED");
    }
  } catch (err) {
    console.warn("Error reading localStorage pets:", err);
  }
  return [];
}

export async function getPets(filters?: {
  species?: string;
  report_type?: string;
  neighborhood?: string;
  search?: string;
}): Promise<PetReport[]> {
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
  let localPets: PetReport[] = [];
  if (typeof window !== "undefined") {
    // From localStorage
    const fromStorage = getLocallyCreatedPets();
    // From IndexedDB
    try {
      const pendingItems = await getPendingReports();
      const fromIndexedDB = pendingItems.map((item) => item.data);
      localPets = [...fromStorage, ...fromIndexedDB];
    } catch (idbErr) {
      localPets = fromStorage;
    }
  }

  // 5. Merge all sources: prioritizing live baseList from server/cloud, then newly added local items
  const seenIds = new Set<string>();
  const merged: PetReport[] = [];

  // Add local un-synced items first
  for (const pet of localPets) {
    if (pet && pet.id && !seenIds.has(pet.id) && pet.status !== "CLOSED" && pet.status !== "REUNITED") {
      seenIds.add(pet.id);
      merged.push(pet);
    }
  }

  // Add server / cloud baseList
  for (const pet of baseList) {
    if (pet && pet.id) {
      if (!seenIds.has(pet.id)) {
        seenIds.add(pet.id);
        merged.push(pet);
      } else {
        // If it already exists from local cache, replace with fresh authoritative server record
        const idx = merged.findIndex((p) => p.id === pet.id);
        if (idx !== -1) {
          merged[idx] = pet;
        }
      }
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
