import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseUrl } from "@/lib/supabase";
import seedPets from "@/data/seed_pets.json";
import { sendNewReportEmail } from "@/lib/email-service";

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
      console.warn("Rejected /api/create-pet (400): Missing mandatory fields", petData);
      return NextResponse.json(
        {
          success: false,
          error: "Datos obligatorios faltantes: el tipo de reporte y el barrio son requeridos.",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    const prefix = petData.report_type === "LOST" ? "B" : "R";

    if (!supabase) {
      console.error("Supabase client is not configured or unavailable in /api/create-pet");
      return NextResponse.json(
        {
          success: false,
          error: "El servicio de base de datos no está disponible actualmente.",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    // 1. Query existing active IDs from Supabase to assign the next sequential ID
    const { data: existingRecords, error: queryError } = await supabase
      .from("pets")
      .select("id")
      .neq("status", "CLOSED")
      .neq("status", "REUNITED")
      .like("id", `${prefix}%`);

    if (queryError) {
      console.warn("Supabase ID query warning in /api/create-pet (falling back to baseline seeds):", {
        message: queryError.message,
        details: queryError.details,
        code: queryError.code,
      });
    }

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
      id: assignedId,
      report_type: petData.report_type,
      species: petData.species || "DOG",
      name: petData.name ? String(petData.name).trim() : (petData.report_type === "LOST" ? "Sin nombre" : "Rescatado"),
      gender: petData.gender || "UNKNOWN",
      primary_color: petData.primary_color ? String(petData.primary_color).trim() : "Deducido por IA",
      secondary_color: petData.secondary_color ? String(petData.secondary_color).trim() : "",
      pattern: petData.pattern ? String(petData.pattern).trim() : "",
      size: petData.size || "MEDIANO",
      distinctive_features: petData.distinctive_features ? String(petData.distinctive_features).trim() : "",
      neighborhood: petData.neighborhood ? String(petData.neighborhood).trim() : "Cali Centro (General)",
      lat: typeof petData.lat === "number" ? petData.lat : 3.4516,
      lng: typeof petData.lng === "number" ? petData.lng : -76.532,
      photo_url: petData.photo_url || "/placeholder-pet.png",
      contact_name: petData.contact_name ? String(petData.contact_name).trim() : "Reportante Anónimo",
      contact_phone: petData.contact_phone ? String(petData.contact_phone).trim() : "",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    };

    let lastError: any = null;
    let insertedPet: any = null;

    // Retry insertion if collision occurs on unique ID
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase
        .from("pets")
        .insert([recordToInsert])
        .select()
        .single();

      if (!error && data) {
        insertedPet = data;
        lastError = null;
        break;
      } else if (error && error.code === "23505") {
        console.warn(`ID collision on ${assignedId} (code 23505), retrying attempt ${attempt + 1}...`);
        nextNum++;
        assignedId = `${prefix}${nextNum + 1}`;
        recordToInsert = { ...recordToInsert, id: assignedId };
        lastError = error;
      } else {
        lastError = error;
        console.error("Supabase insert error details in /api/create-pet:", {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          record: recordToInsert,
        });
        break;
      }
    }

    if (lastError || !insertedPet) {
      const host = (supabaseUrl || "").replace(/^https?:\/\//, "").split(".")[0];
      console.error(`Supabase project (${host}) rejected insertion in /api/create-pet:`, lastError);
      return NextResponse.json(
        {
          success: false,
          error: `[Proyecto Supabase: ${host}] ${lastError?.message || "Rechazo de inserción en Supabase"}`,
          details: lastError?.details || "No se pudo insertar el registro en la base de datos.",
          hint: lastError?.hint,
          code: lastError?.code || "INSERT_FAILED",
        },
        { status: 400 }
      );
    }

    // Dispatch email notification directly from server
    try {
      await sendNewReportEmail(insertedPet);
      console.log(`[create-pet] Notification email successfully sent for pet ${insertedPet.id}`);
    } catch (emailErr) {
      console.warn(`[create-pet] Email delivery skipped/failed for ${insertedPet.id}:`, emailErr);
    }

    return NextResponse.json({ success: true, pet: insertedPet }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error in /api/create-pet:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error interno del servidor",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
