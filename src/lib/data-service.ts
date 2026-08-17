import seedPets from "@/data/seed_pets.json";
import { PetReport } from "./types";
import { supabase } from "./supabase";

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
    console.warn("Error reading locally created pets:", err);
  }
  return [];
}

export async function getPets(filters?: {
  species?: string;
  report_type?: string;
  neighborhood?: string;
  search?: string;
}): Promise<PetReport[]> {
  const localUserPets = getLocallyCreatedPets();
  let baseList: PetReport[] = [];

  // 1. If Supabase client is configured, fetch live records from Supabase
  if (supabase) {
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
    } catch (err) {
      console.warn("Supabase query failed, using local fallback:", err);
    }
  }

  // 2. Fallback to seedPets if baseList is empty
  if (baseList.length === 0) {
    baseList = (seedPets as PetReport[]).filter(
      (p) => p.status !== "CLOSED" && p.status !== "REUNITED"
    );
  }

  // 3. Merge locally created pets on top and deduplicate by ID
  const seenIds = new Set<string>();
  const merged: PetReport[] = [];

  for (const pet of [...localUserPets, ...baseList]) {
    if (pet && pet.id && !seenIds.has(pet.id)) {
      seenIds.add(pet.id);
      merged.push(pet);
    }
  }

  // 4. Apply in-memory filters to the merged dataset
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
