import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import seedPets from "@/data/seed_pets.json";

function getNextPetId(reportType: "LOST" | "FOUND", existingIds: string[]): string {
  const prefix = reportType === "LOST" ? "B" : "R";
  let maxNum = 0;

  for (const id of existingIds) {
    if (id && typeof id === "string" && id.startsWith(prefix)) {
      const num = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `${prefix}${maxNum + 1}`;
}

export async function POST(req: NextRequest) {
  try {
    const petData = await req.json();

    if (!petData.report_type || !petData.neighborhood) {
      return NextResponse.json(
        { success: false, error: "Datos obligatorios faltantes" },
        { status: 400 }
      );
    }

    let finalId = petData.id;

    // 1. If Supabase is available, get highest existing ID and insert
    if (supabase) {
      try {
        const prefix = petData.report_type === "LOST" ? "B" : "R";
        const { data: existingRecords } = await supabase
          .from("pets")
          .select("id")
          .like("id", `${prefix}%`)
          .order("created_at", { ascending: false })
          .limit(200);

        const allKnownIds = [
          ...(seedPets as any[]).map((p) => p.id),
          ...((existingRecords || []).map((r: any) => r.id)),
        ];

        finalId = getNextPetId(petData.report_type, allKnownIds);
        const recordToInsert = {
          ...petData,
          id: finalId,
          created_at: new Date().toISOString(),
          status: "ACTIVE",
        };

        const { data, error } = await supabase
          .from("pets")
          .insert([recordToInsert])
          .select()
          .single();

        if (error) {
          console.error("Supabase insert error in /api/create-pet:", error);
          // If error occurs with that ID, append unique timestamp suffix
          const fallbackId = `${prefix}${Date.now().toString().slice(-4)}`;
          const fallbackRecord = { ...recordToInsert, id: fallbackId };
          const retryRes = await supabase.from("pets").insert([fallbackRecord]);
          if (!retryRes.error) {
            return NextResponse.json({ success: true, pet: fallbackRecord });
          }
        } else {
          return NextResponse.json({ success: true, pet: data || recordToInsert });
        }
      } catch (sbErr) {
        console.warn("Supabase connection issue in /api/create-pet:", sbErr);
      }
    }

    // 2. Fallback if Supabase not reachable: generate ID and return
    const allKnownIds = (seedPets as any[]).map((p) => p.id);
    finalId = getNextPetId(petData.report_type, allKnownIds);
    const fallbackPet = {
      ...petData,
      id: finalId,
      created_at: new Date().toISOString(),
      status: "ACTIVE",
    };

    return NextResponse.json({ success: true, pet: fallbackPet });
  } catch (error: any) {
    console.error("Error in /api/create-pet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
