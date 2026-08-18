import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import seedPets from "@/data/seed_pets.json";
import { PetReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const species = searchParams.get("species");
    const report_type = searchParams.get("report_type");
    const neighborhood = searchParams.get("neighborhood");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search");

    let baseList: PetReport[] = [];

    // 1. Try fetching live records from Supabase
    if (supabase) {
      try {
        let query = supabase
          .from("pets")
          .select("*")
          .neq("status", "CLOSED")
          .neq("status", "REUNITED")
          .order("created_at", { ascending: false });

        if (species && species !== "ALL") {
          query = query.eq("species", species);
        }
        if (report_type && report_type !== "ALL") {
          query = query.eq("report_type", report_type);
        }
        if (gender && gender !== "ALL") {
          if (gender === "UNKNOWN") {
            query = query.or("gender.is.null,gender.eq.UNKNOWN");
          } else {
            query = query.eq("gender", gender);
          }
        }
        if (neighborhood && neighborhood !== "ALL") {
          query = query.ilike("neighborhood", `%${neighborhood}%`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          baseList = data as PetReport[];
        }
      } catch (sbErr) {
        console.warn("Supabase query error in /api/pets:", sbErr);
      }
    }

    // 2. Fallback to seedPets if Supabase returns nothing or is unreachable
    if (baseList.length === 0) {
      baseList = (seedPets as PetReport[]).filter(
        (p) => p.status !== "CLOSED" && p.status !== "REUNITED"
      );

      if (species && species !== "ALL") {
        baseList = baseList.filter((p) => p.species === species);
      }
      if (report_type && report_type !== "ALL") {
        baseList = baseList.filter((p) => p.report_type === report_type);
      }
      if (gender && gender !== "ALL") {
        if (gender === "UNKNOWN") {
          baseList = baseList.filter((p) => !p.gender || p.gender === "UNKNOWN");
        } else {
          baseList = baseList.filter((p) => p.gender === gender);
        }
      }
      if (neighborhood && neighborhood !== "ALL") {
        baseList = baseList.filter((p) =>
          p.neighborhood.toLowerCase().includes(neighborhood.toLowerCase())
        );
      }
    }

    // 3. Optional text search filter
    if (search) {
      const q = search.toLowerCase();
      baseList = baseList.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.primary_color.toLowerCase().includes(q) ||
          p.neighborhood.toLowerCase().includes(q) ||
          (p.distinctive_features && p.distinctive_features.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ success: true, pets: baseList });
  } catch (err: any) {
    console.error("Error in /api/pets:", err);
    return NextResponse.json(
      { success: false, error: err.message, pets: seedPets },
      { status: 500 }
    );
  }
}
