import { NextRequest, NextResponse } from "next/server";
import { sendCaseClosedEmail } from "@/lib/email-service";
import { supabase } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";

// Master code defined in .env.local or fallback to default
const ADMIN_MASTER_CODE = (process.env.ADMIN_MASTER_CODE || "CALI2026").trim();

export async function POST(req: NextRequest) {
  try {
    const { petId, passcode, petName } = await req.json();

    if (!petId || !passcode) {
      return NextResponse.json(
        { error: "Faltan datos (ID de mascota o código maestro)" },
        { status: 400 }
      );
    }

    // Verify master code
    if (passcode.trim() !== ADMIN_MASTER_CODE) {
      return NextResponse.json(
        { error: "Código maestro incorrecto. Acceso denegado." },
        { status: 401 }
      );
    }

    // 1. Update in Supabase if configured
    if (supabase) {
      try {
        await supabase
          .from("pets")
          .update({ status: "CLOSED", closed_at: new Date().toISOString() })
          .eq("id", petId);
      } catch (sbErr) {
        console.warn("Supabase update error:", sbErr);
      }
    }

    // 2. Persist closure to seed_pets.json on disk (for local dev)
    try {
      const filePath = path.join(process.cwd(), "src", "data", "seed_pets.json");
      const fileData = await fs.readFile(filePath, "utf-8");
      const pets = JSON.parse(fileData);

      let found = false;
      const updatedPets = pets.map((p: any) => {
        if (p.id === petId) {
          found = true;
          return { ...p, status: "CLOSED", closed_at: new Date().toISOString() };
        }
        return p;
      });

      if (found) {
        await fs.writeFile(filePath, JSON.stringify(updatedPets, null, 2), "utf-8");
      }
    } catch (fsErr) {
      console.warn("Could not write directly to seed_pets.json:", fsErr);
    }

    // 3. Send email notification to busquedanimalcali@gmail.com
    try {
      await sendCaseClosedEmail(petId, petName);
    } catch (emailErr) {
      console.warn("Could not dispatch case closed email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `El caso de la mascota ${petId} ha sido cerrado exitosamente.`,
    });
  } catch (error: any) {
    console.error("Error closing case:", error);
    return NextResponse.json(
      { error: "Error al procesar el cierre del caso", details: error?.message },
      { status: 500 }
    );
  }
}
