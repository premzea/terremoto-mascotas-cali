import seedPets from "@/data/seed_pets.json";
import { PetReport } from "./types";
import { supabase } from "./supabase";

export async function getPets(filters?: {
  species?: string;
  report_type?: string;
  neighborhood?: string;
  search?: string;
}): Promise<PetReport[]> {
  // If Supabase client is configured, fetch live records from Supabase
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
        let liveList = data as PetReport[];
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          liveList = liveList.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.primary_color.toLowerCase().includes(q) ||
              p.neighborhood.toLowerCase().includes(q) ||
              (p.distinctive_features && p.distinctive_features.toLowerCase().includes(q))
          );
        }
        return liveList;
      }
    } catch (err) {
      console.warn("Supabase query failed, using local seed fallback:", err);
    }
  }

  // Local Seed Fallback (for local testing, offline support or zero-config dev)
  let list = (seedPets as PetReport[]).filter(
    (p) => p.status !== "CLOSED" && p.status !== "REUNITED"
  );

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
