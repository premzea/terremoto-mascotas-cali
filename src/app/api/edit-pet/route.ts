import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PetReport } from "@/lib/types";

const ADMIN_MASTER_CODE = (process.env.ADMIN_MASTER_CODE || "CALI2026").trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { petId, passcode, updatedFields } = body;

    if (!petId || !passcode) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (ID o Código Maestro)." },
        { status: 400 }
      );
    }

    // Verify master code
    if (passcode.trim().toUpperCase() !== ADMIN_MASTER_CODE.toUpperCase()) {
      return NextResponse.json(
        { error: "Código maestro incorrecto. Acceso denegado." },
        { status: 403 }
      );
    }

    if (!updatedFields || typeof updatedFields !== "object") {
      return NextResponse.json(
        { error: "No se proporcionaron campos a actualizar." },
        { status: 400 }
      );
    }

    // Sanitize editable fields
    const safeUpdates: Partial<PetReport> = {};
    if (updatedFields.name !== undefined) safeUpdates.name = updatedFields.name.trim();
    if (updatedFields.species !== undefined) safeUpdates.species = updatedFields.species;
    if (updatedFields.gender !== undefined) safeUpdates.gender = updatedFields.gender;
    if (updatedFields.size !== undefined) safeUpdates.size = updatedFields.size;
    if (updatedFields.primary_color !== undefined) safeUpdates.primary_color = updatedFields.primary_color.trim();
    if (updatedFields.neighborhood !== undefined) safeUpdates.neighborhood = updatedFields.neighborhood.trim();
    if (updatedFields.distinctive_features !== undefined) safeUpdates.distinctive_features = updatedFields.distinctive_features.trim();
    if (updatedFields.contact_name !== undefined) safeUpdates.contact_name = updatedFields.contact_name.trim();
    if (updatedFields.contact_phone !== undefined) safeUpdates.contact_phone = updatedFields.contact_phone.trim();

    // 1. Update in Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from("pets")
        .update(safeUpdates)
        .eq("id", petId)
        .select();

      if (error) {
        console.error("Error updating pet in Supabase:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reporte actualizado exitosamente.",
      petId,
      updates: safeUpdates,
    });
  } catch (err: any) {
    console.error("Error in /api/edit-pet:", err);
    return NextResponse.json(
      { error: err?.message || "Error al procesar la actualización del reporte." },
      { status: 500 }
    );
  }
}
