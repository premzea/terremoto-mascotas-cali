import seedPets from "@/data/seed_pets.json";
import { PetReport } from "./types";

export async function getPets(filters?: {
  species?: string;
  report_type?: string;
  neighborhood?: string;
  search?: string;
}): Promise<PetReport[]> {
  let list = seedPets as PetReport[];

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
