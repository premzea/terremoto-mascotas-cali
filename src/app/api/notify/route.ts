import { NextRequest, NextResponse } from "next/server";
import { sendNewReportEmail, sendMatchContactEmail } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json({ error: "Missing notification type" }, { status: 400 });
    }

    if (type === "NEW_REPORT") {
      await sendNewReportEmail(data.pet);
      return NextResponse.json({ success: true, message: "New report notification sent" });
    }

    if (type === "MATCH_CONTACT") {
      await sendMatchContactEmail(data);
      return NextResponse.json({ success: true, message: "Match contact email sent" });
    }

    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/notify:", error);
    return NextResponse.json(
      { error: "Failed to send notification", details: error?.message || error },
      { status: 500 }
    );
  }
}
