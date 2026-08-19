import { NextRequest, NextResponse } from "next/server";

const ADMIN_MASTER_CODE = (process.env.ADMIN_MASTER_CODE || "CALI2026").trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode) {
      return NextResponse.json({ error: "Falta código." }, { status: 400 });
    }

    if (passcode.trim().toUpperCase() === ADMIN_MASTER_CODE.toUpperCase()) {
      return NextResponse.json({ success: true, verified: true });
    } else {
      return NextResponse.json(
        { error: "Código maestro incorrecto. Acceso denegado." },
        { status: 403 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: "Error de verificación." }, { status: 500 });
  }
}
