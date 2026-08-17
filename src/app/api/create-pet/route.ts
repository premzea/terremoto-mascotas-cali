import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import seedPets from "@/data/seed_pets.json";

function calculateNextId(reportType: "LOST" | "FOUND", existingIds: string[]): string {
  const prefix = reportType === "LOST" ? "B" : "R";
  // Minimum baselines from user Excel database (B107 and R146)
  let maxNum = reportType === "LOST" ? 107 : 146;

  for (const id of existingIds) {
    if (id && typeof id === "string") {
      const trimmed = id.trim().toUpperCase();
      if (trimmed.startsWith(prefix)) {
        // Extract pure digits
        const numPart = trimmed.slice(prefix.length);
        if (/^\d+$/.test(numPart)) {
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
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

    const prefix = petData.report_type === "LOST" ? "B" : "R";

    // 1. If Supabase is available, calculate the true sequential ID from Supabase
    if (supabase) {
      try {
        const { data: existingRecords } = await supabase
          .from("pets")
          .select("id")
          .neq("status", "CLOSED")
          .neq("status", "REUNITED")
          .like("id", `${prefix}%`);

        const allKnownIds = [
          ...(seedPets as any[]).map((p) => p.id),
          ...((existingRecords || []).map((r: any) => r.id)),
        ];

        let nextNum = petData.report_type === "LOST" ? 107 : 146;
        for (const id of allKnownIds) {
          if (id && typeof id === "string") {
            const trimmed = id.trim().toUpperCase();
            if (trimmed.startsWith(prefix)) {
              const numPart = trimmed.slice(prefix.length);
              if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > nextNum) {
                  nextNum = num;
                }
              }
            }
          }
        }

        let assignedId = `${prefix}${nextNum + 1}`;
        let recordToInsert = {
          ...petData,
          id: assignedId,
          created_at: new Date().toISOString(),
          status: "ACTIVE",
        };

        // Try inserting, retry with incremented ID if collision occurs
        let insertSuccess = false;
        let insertedPet = recordToInsert;

        for (let attempt = 0; attempt < 5; attempt++) {
          const { data, error } = await supabase
            .from("pets")
            .insert([recordToInsert])
            .select()
            .single();

          if (!error && data) {
            insertSuccess = true;
            insertedPet = data;
            break;
          } else if (error && error.code === "23505") {
            // Unique constraint violation: increment number and retry
            nextNum++;
            assignedId = `${prefix}${nextNum + 1}`;
            recordToInsert = { ...recordToInsert, id: assignedId };
          } else {
            console.error("Supabase insert error in /api/create-pet:", error);
            break;
          }
        }

        if (insertSuccess) {
          return NextResponse.json({ success: true, pet: insertedPet });
        }
      } catch (sbErr) {
        console.warn("Supabase connection issue in /api/create-pet:", sbErr);
      }
    }

    // 2. Fallback if Supabase not reachable: generate clean sequential ID based on seed
    const allKnownIds = (seedPets as any[]).map((p) => p.id);
    const fallbackId = calculateNextId(petData.report_type, allKnownIds);
    const fallbackPet = {
      ...petData,
      id: fallbackId,
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
