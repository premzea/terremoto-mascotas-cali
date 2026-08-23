import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const petMetadataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    species: {
      type: Type.STRING,
      enum: ["DOG", "CAT", "OTHER"],
    },
    size: {
      type: Type.STRING,
      enum: ["SMALL", "MEDIUM", "LARGE", "UNKNOWN"],
    },
    fur_length: {
      type: Type.STRING,
      enum: ["SHORT", "MEDIUM", "LONG", "HAIRLESS", "UNKNOWN"],
    },
    head_and_muzzle_shape: {
      type: Type.STRING,
      enum: ["POINTED_WEDGE", "BROAD_FLAT", "PRISMATIC_SQUARE", "ROUND_DELICATE", "UNKNOWN"],
    },
    ear_type: {
      type: Type.STRING,
      enum: ["ERECT", "FLOPPY", "SEMI_ERECT", "UNKNOWN"],
    },
    body_build: {
      type: Type.STRING,
      enum: ["STURDY_PROPORTIONATE", "HEAVY_MASSIVE", "SLENDER_AERODYNAMIC", "COMPACT_DWARF", "TOY_MINIATURE", "UNKNOWN"],
    },
    coat_colors: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: ["BLACK", "WHITE", "BROWN", "GOLDEN_YELLOW", "GRAY_SILVER", "CREAM", "ORANGE_RED"],
      },
    },
    coat_pattern: {
      type: Type.STRING,
      enum: ["SOLID", "SPOTTED", "STRIPED_TABBY", "MERLE_BRINDLE", "PATCHED_CALICO", "BICOLOR_TUXEDO", "POINTED_SIAMESE", "UNKNOWN"],
    },
    eye_color: {
      type: Type.STRING,
      enum: ["BLACK", "BROWN", "BLUE", "GREEN", "AMBER", "HETEROCHROMIA", "UNKNOWN"],
    },
    nose_color: {
      type: Type.STRING,
      enum: ["BLACK", "PINK", "BROWN", "SPOTTED", "UNKNOWN"],
    },
    distinctive_features: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Max 3 unique visible traits or accessories in Spanish (ej: manchas en el pecho, collar rojo)",
    },
  },
  required: ["species", "coat_colors", "coat_pattern"],
};

const COLOR_TRANSLATION: Record<string, string> = {
  BLACK: "Negro",
  WHITE: "Blanco",
  BROWN: "Café / Marrón",
  GOLDEN_YELLOW: "Dorado / Amarillo",
  ORANGE_RED: "Naranja / Rojo",
  GRAY_SILVER: "Gris / Plateado",
  CREAM: "Crema / Beige",
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not configured in environment variables.");
      return NextResponse.json(
        {
          success: false,
          warning: "GEMINI_API_KEY no está configurada en las variables de entorno de Vercel.",
          traits: null,
        },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.imageBase64) {
      return NextResponse.json(
        { success: false, error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType = "image/jpeg" } = body;
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const promptText = `Analyze this pet photo according to the strict Enum schema.
Extract: species, fur_length, ear_type, all visible coat_colors (array), coat_pattern, eye_color, nose_color, and up to 3 distinctive_features.
IMPORTANT: All distinctive_features MUST BE WRITTEN STRICTLY IN SPANISH (español), e.g. "mancha blanca en el pecho", "patas blancas", "trufa rosada", "máscara negra", "collar azul", "pecho blanco", etc.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: petMetadataSchema,
          temperature: 0.0,
        },
      });
    } catch (primaryErr) {
      console.warn("Primary model gemini-3.6-flash error, trying fallback gemini-3.5-flash-lite:", primaryErr);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: petMetadataSchema,
          temperature: 0.0,
        },
      });
    }

    const parsedJson = JSON.parse(response.text || "{}");
    
    // Map raw AI schema to friendly frontend traits
    const spanishColors = (parsedJson.coat_colors || [])
      .map((c: string) => COLOR_TRANSLATION[c] || c)
      .join(", ");

    const traits = {
      species: parsedJson.species || "DOG",
      coat_colors: parsedJson.coat_colors || [],
      primary_color: spanishColors || "Deducido por IA",
      ear_type: parsedJson.ear_type || "UNKNOWN",
      eye_color: parsedJson.eye_color || "UNKNOWN",
      nose_color: parsedJson.nose_color || "UNKNOWN",
      coat_pattern: parsedJson.coat_pattern || "UNKNOWN",
      fur_length: parsedJson.fur_length || "UNKNOWN",
      distinctive_marks: (parsedJson.distinctive_features || []).join(". "),
      search_summary: `Pelaje: ${spanishColors || "No especificado"}. ${
        (parsedJson.distinctive_features || []).join(". ")
      }`.trim(),
      raw: parsedJson,
    };

    return NextResponse.json({ success: true, metadata: parsedJson, traits });
  } catch (error: unknown) {
    console.error("Gemini trait extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : "Error analyzing pet image";
    return NextResponse.json(
      { success: false, error: errorMessage, traits: null },
      { status: 200 }
    );
  }
}
