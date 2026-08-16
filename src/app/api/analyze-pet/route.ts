import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `Eres un experto veterinario y perito en identificación visual de animales en emergencias de desastres.
Analiza la fotografía de la mascota y extrae sus rasgos físicos con precisión para cotejo de búsqueda.
Responde ÚNICAMENTE con un objeto JSON válido con este esquema exacto:
{
  "species": "DOG" | "CAT" | "OTHER",
  "breed_likely": string,
  "primary_color": string,
  "secondary_color": string,
  "coat_pattern": "SOLIDO" | "MANCHAS" | "RAYAS" | "BICOLOR" | "CAREY",
  "ear_type": "ERECTAS" | "CAIDAS" | "SEMI-ERECTAS",
  "fur_length": "CORTO" | "MEDIANO" | "LARGO",
  "distinctive_marks": string,
  "search_summary": string
}
`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `${SYSTEM_PROMPT}\n\nAnaliza visualmente la fotografía de esta mascota y devuelve el JSON de rasgos físicos.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const responseText = response.text?.trim() || "{}";
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      traits: parsedData,
    });
  } catch (error: any) {
    console.error("Error in /api/analyze-pet:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze image with Gemini" },
      { status: 500 }
    );
  }
}
