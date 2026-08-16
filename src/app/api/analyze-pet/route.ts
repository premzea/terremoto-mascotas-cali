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
      enum: ["BROWN", "BLUE", "GREEN", "AMBER", "HETEROCHROMIA", "UNKNOWN"],
    },
    nose_color: {
      type: Type.STRING,
      enum: ["BLACK", "PINK", "BROWN", "SPOTTED", "UNKNOWN"],
    },
    distinctive_features: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Max 3 unique visible traits or accessories",
    },
  },
  required: ["species", "coat_colors", "coat_pattern"],
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const { imageBase64, mimeType = "image/jpeg" } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              text: `Analyze this pet photo according to the strict Enum schema.
Extract: species, size, fur_length, head_and_muzzle_shape, ear_type, body_build, all visible coat_colors (array), coat_pattern, eye_color, nose_color, and up to 3 distinctive_features.`,
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

    const parsedJson = JSON.parse(response.text || "{}");
    return NextResponse.json({ success: true, metadata: parsedJson });
  } catch (error: unknown) {
    console.error("Gemini trait extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : "Error analyzing pet image";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
