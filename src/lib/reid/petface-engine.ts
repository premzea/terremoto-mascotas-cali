import {
  CanonicalPetAttributes,
  DEFAULT_REID_WEIGHTS,
  MultimodalMatchScoreResult,
  PetFaceEmbedding,
  PetReIDFeatures,
  ReIDScoringWeights,
  VisualClipEmbedding,
} from "./types";
import { PetReport } from "../types";
import { calculateDistanceKm, cosineSimilarity } from "../matching-engine";

/**
 * Calculates dot-product cosine similarity between two normalized vectors.
 */
export function calculateVectorCosine(vecA?: number[], vecB?: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity));
}

const TEMPLATE_STOPWORDS = new Set([
  "color", "color:", "patron", "patrón", "patron:", "patrón:",
  "pelaje", "pelaje:", "ojos", "ojos:", "tamano", "tamaño", "tamano:", "tamaño:",
  "senas", "señas", "senas:", "señas:", "accesorios", "accesorios:",
  "senas/accesorios:", "señas/accesorios:", "barrio", "barrio:", "ninguno", "ninguna",
  "desconocido", "desconocida", "parece", "como", "esta", "está", "foto", "foto:", "undefined", "null", "na"
]);

/**
 * Computes attribute Jaccard / categorical similarity between canonical Gemini traits.
 */
export function computeAttributeSimilarity(
  attrA: CanonicalPetAttributes,
  attrB: CanonicalPetAttributes
): { similarity: number; matchedReasons: string[] } {
  const matchedReasons: string[] = [];
  let scorePoints = 0;
  let maxPoints = 0;

  // 1. Dominant-Aware & Pigment-Aware Coat Color Matching (Max 35 pts)
  maxPoints += 35;
  const colorsA = attrA.coat_colors.map((c) => c.toLowerCase());
  const colorsB = attrB.coat_colors.map((c) => c.toLowerCase());

  const nonWhiteA = colorsA.filter((c) => !/blanco|white/.test(c));
  const nonWhiteB = colorsB.filter((c) => !/blanco|white/.test(c));
  const hasWhiteA = colorsA.some((c) => /blanco|white/.test(c));
  const hasWhiteB = colorsB.some((c) => /blanco|white/.test(c));

  const domPigmentA = nonWhiteA[0] || (hasWhiteA ? "white" : "unknown");
  const domPigmentB = nonWhiteB[0] || (hasWhiteB ? "white" : "unknown");

  const hasWarmA = colorsA.some(c => /orange|red|ginger|yellow|calico|carey|brown/.test(c));
  const hasWarmB = colorsB.some(c => /orange|red|ginger|yellow|calico|carey|brown/.test(c));
  const isCalicoOrTortieA = attrA.coat_pattern === "PATCHED_CALICO" || (colorsA.length >= 3 && hasWarmA);
  const isCalicoOrTortieB = attrB.coat_pattern === "PATCHED_CALICO" || (colorsB.length >= 3 && hasWarmB);

  // Check pigment compatibility
  const sharedPigments = nonWhiteA.filter(c => nonWhiteB.includes(c));
  const exactPigmentSetMatch =
    nonWhiteA.length === nonWhiteB.length &&
    nonWhiteA.every(c => nonWhiteB.includes(c)) &&
    hasWhiteA === hasWhiteB;

  // Major dominant color clash: Black vs Golden/Yellow/Cream, or White vs Black
  const isBlackDomA = /black|negro/.test(domPigmentA);
  const isBlackDomB = /black|negro/.test(domPigmentB);
  const isYellowDomA = /yellow|golden|cream|rubio|amarillo/.test(domPigmentA);
  const isYellowDomB = /yellow|golden|cream|rubio|amarillo/.test(domPigmentB);
  const isWhiteDomA = /white|blanco/.test(domPigmentA);
  const isWhiteDomB = /white|blanco/.test(domPigmentB);

  const dominantClash =
    (isBlackDomA && (isYellowDomB || isWhiteDomB)) ||
    (isBlackDomB && (isYellowDomA || isWhiteDomA)) ||
    (isWhiteDomA && isYellowDomB) ||
    (isWhiteDomB && isYellowDomA);

  const pigmentMismatch = nonWhiteA.length > 0 && nonWhiteB.length > 0 && sharedPigments.length === 0;

  if (colorsA.length > 0 && colorsB.length > 0) {
    if ((isCalicoOrTortieA && !hasWarmB && colorsB.length <= 2) || (isCalicoOrTortieB && !hasWarmA && colorsA.length <= 2)) {
      scorePoints += 8; // Calico vs strict Bicolor
    } else if (dominantClash) {
      scorePoints += 4; // Major dominant color clash (e.g. Black vs Yellow/Golden Dog)
    } else if (exactPigmentSetMatch) {
      scorePoints += 35;
      matchedReasons.push(`🎨 Color base y acento idénticos (${nonWhiteA.join(", ")} ${hasWhiteA ? "+ blanco" : ""})`);
    } else if (domPigmentA === domPigmentB && domPigmentA !== "unknown") {
      scorePoints += 25;
      matchedReasons.push(`🎨 Mismo color base dominante: ${domPigmentA}`);
    } else if (sharedPigments.length > 0) {
      scorePoints += 12;
      matchedReasons.push(`🎨 Coincidencia parcial de tono secundario: ${sharedPigments.join(", ")}`);
    } else {
      scorePoints += 5;
    }
  } else {
    scorePoints += 15;
  }

  // 2. Coat Pattern Matching (Max 15 pts)
  maxPoints += 15;
  const patA = attrA.coat_pattern;
  const patB = attrB.coat_pattern;
  if (patA && patB && patA !== "UNKNOWN" && patB !== "UNKNOWN") {
    if (patA === patB) {
      if (dominantClash || pigmentMismatch) {
        scorePoints += 4;
      } else {
        scorePoints += 15;
        matchedReasons.push(`✨ Patrón de pelaje idéntico (${patA.toLowerCase()})`);
      }
    } else if (
      (patA === "PATCHED_CALICO" && (patB === "BICOLOR_TUXEDO" || patB === "SOLID")) ||
      (patB === "PATCHED_CALICO" && (patA === "BICOLOR_TUXEDO" || patA === "SOLID"))
    ) {
      scorePoints += 0;
    } else {
      scorePoints += 6;
    }
  } else {
    scorePoints += 8;
  }

  // 3. Breed / Morphological category (Max 20 pts)
  maxPoints += 20;
  if (attrA.breed && attrB.breed) {
    const bA = attrA.breed.toLowerCase();
    const bB = attrB.breed.toLowerCase();
    if (bA === bB || bA.includes(bB) || bB.includes(bA)) {
      scorePoints += 20;
      matchedReasons.push(`🏷️ Raza / morfología: ${attrA.breed}`);
    } else {
      scorePoints += 5;
    }
  } else {
    scorePoints += 10;
  }

  // 4. Body Size (Max 10 pts)
  maxPoints += 10;
  if (attrA.size === attrB.size) {
    scorePoints += 10;
    matchedReasons.push(`📏 Mismo tamaño (${attrA.size.toLowerCase()})`);
  } else if (
    (attrA.size === "MEDIANO" && (attrB.size === "PEQUEÑO" || attrB.size === "GRANDE")) ||
    (attrB.size === "MEDIANO" && (attrA.size === "PEQUEÑO" || attrA.size === "GRANDE"))
  ) {
    scorePoints += 5; // Adjacent size
  }

  // 5. Ears & Tail Shape (Max 10 pts)
  maxPoints += 10;
  if (attrA.ear_type && attrB.ear_type && attrA.ear_type !== "UNKNOWN" && attrA.ear_type === attrB.ear_type) {
    scorePoints += 5;
    matchedReasons.push(`👂 Mismo tipo de orejas (${attrA.ear_type.toLowerCase()})`);
  }
  if (attrA.tail_type && attrB.tail_type && attrA.tail_type !== "UNKNOWN" && attrA.tail_type === attrB.tail_type) {
    scorePoints += 5;
  }

  // 6. Distinctive Markings Overlap without Form Template Boilerplate (Max 10 pts)
  maxPoints += 10;
  if (attrA.distinctive_markings.length > 0 && attrB.distinctive_markings.length > 0) {
    const cleanTokens = (str: string) =>
      str
        .toLowerCase()
        .replace(/[•,.;:()/\\]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !TEMPLATE_STOPWORDS.has(w));

    const wordsA = cleanTokens(attrA.distinctive_markings.join(" "));
    const wordsB = cleanTokens(attrB.distinctive_markings.join(" "));
    const sharedWords = Array.from(new Set(wordsA.filter((w) => wordsB.includes(w))));

    if (sharedWords.length > 0) {
      scorePoints += 10;
      matchedReasons.push(`✨ Seña particular: ${sharedWords.slice(0, 2).join(", ")}`);
    }
  }

  const similarity = maxPoints > 0 ? scorePoints / maxPoints : 0.5;
  return { similarity: Math.max(0, Math.min(1, similarity)), matchedReasons };
}

/**
 * Calculates continuous geographic plausibility using exponential decay.
 * Cali radius is ~12km; animals travel up to 8km in disaster dispersion.
 */
export function calculateGeospatialPlausibility(distanceKm: number): number {
  // Gaussian / Exponential soft decay: e^(-d / 8.0)
  return Math.exp(-distanceKm / 8.0);
}

/**
 * Calculates temporal plausibility based on hours elapsed between lost and found.
 */
export function calculateTemporalPlausibility(hoursElapsed?: number, distanceKm?: number): number {
  if (hoursElapsed === undefined || distanceKm === undefined) return 0.9;
  // If sighted 15km away within 10 minutes, speed is impossible -> penalize
  if (hoursElapsed <= 0.5 && distanceKm > 5.0) return 0.2;
  // Standard disaster temporal decay
  return Math.max(0.4, Math.min(1.0, 1.0 - hoursElapsed / (24 * 30)));
}

/**
 * Tri-Factor Multimodal Matching Engine:
 * Dynamically scores a candidate against a target using high-dimensional vision tensors (DINOv2),
 * canonical structured Gemini morphological attributes, and continuous exponential geospatial decay.
 */
export function scorePetReIDPair(
  target: PetReIDFeatures,
  candidate: PetReIDFeatures,
  candidateReport: PetReport,
  weights: ReIDScoringWeights = DEFAULT_REID_WEIGHTS
): MultimodalMatchScoreResult | null {
  // 1. HARD DETERMINISTIC EXCLUSION: Species Gate
  if (target.species !== candidate.species) {
    return null;
  }

  // 2. Biometric Facial Similarity (PetFace)
  let petfaceSim: number | undefined = undefined;
  const hasBothFaces =
    target.faceDetected &&
    candidate.faceDetected &&
    target.petface?.vector &&
    candidate.petface?.vector;

  if (hasBothFaces) {
    petfaceSim = calculateVectorCosine(target.petface!.vector, candidate.petface!.vector);
  }

  // 3. Whole-Body Semantic Similarity (DINOv2 / OpenCLIP)
  let clipSim: number | undefined = undefined;
  if (target.visualClip?.vector && candidate.visualClip?.vector) {
    clipSim = calculateVectorCosine(target.visualClip.vector, candidate.visualClip.vector);
  }

  // 4. Structured Visual Attributes
  const { similarity: attributeSim, matchedReasons } = computeAttributeSimilarity(
    target.canonicalAttributes,
    candidate.canonicalAttributes
  );

  // 5. Geographic Plausibility
  const distanceKm = calculateDistanceKm(target.lat, target.lng, candidate.lat, candidate.lng);
  const geoPlausibility = calculateGeospatialPlausibility(distanceKm);

  // 6. Temporal Plausibility
  const temporalPlausibility = calculateTemporalPlausibility(48, distanceKm);

  // -------------------------------------------------------------
  // DYNAMIC WEIGHT ALLOCATION
  // If face is NOT detected in one of the photos, dynamically redistribute
  // PetFace weight to whole-body CLIP and structured attributes.
  // -------------------------------------------------------------
  let effectivePetfaceWeight = weights.petfaceWeight;
  let effectiveClipWeight = weights.clipVisualWeight;
  let effectiveAttrWeight = weights.attributeWeight;
  let effectiveGeoWeight = weights.geospatialWeight;
  let effectiveTempWeight = weights.temporalWeight;

  if (!hasBothFaces) {
    // Redistribute the 0.35 PetFace weight
    const redistributed = effectivePetfaceWeight;
    effectivePetfaceWeight = 0;
    effectiveClipWeight += redistributed * 0.5; // +0.175
    effectiveAttrWeight += redistributed * 0.35; // +0.1225
    effectiveGeoWeight += redistributed * 0.15; // +0.0525
  }

  // Compute composite score (0.0 to 1.0)
  let compositeScore =
    (petfaceSim !== undefined ? petfaceSim * effectivePetfaceWeight : 0) +
    (clipSim !== undefined ? clipSim * effectiveClipWeight : 0.5 * effectiveClipWeight) +
    attributeSim * effectiveAttrWeight +
    geoPlausibility * effectiveGeoWeight +
    temporalPlausibility * effectiveTempWeight;

  // If core morphological attributes clash (e.g. Gray vs Black pigment) without strong facial biometrics,
  // cap composite score so it does not produce false positives above the 50% threshold.
  if (attributeSim < 0.40 && (!petfaceSim || petfaceSim < 0.70)) {
    compositeScore = Math.min(compositeScore, 0.48);
  }

  // Scale to 0-100 percentage
  const totalScore = Math.round(Math.min(99, Math.max(10, compositeScore * 100)));

  // Assemble reasons for human triage
  const reasons: string[] = [];
  if (hasBothFaces && petfaceSim !== undefined && petfaceSim >= 0.70) {
    reasons.push(`🧬 Biometría facial PetFace (${Math.round(petfaceSim * 100)}%)`);
  }
  if (clipSim !== undefined && clipSim >= 0.75) {
    reasons.push(`👁️ Similitud visual de cuerpo (${Math.round(clipSim * 100)}%)`);
  }
  reasons.push(...matchedReasons);
  if (distanceKm <= 3.0) {
    reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood || "la zona"}`);
  }

  return {
    candidatePet: candidateReport,
    totalScore,
    subScores: {
      petfaceSim,
      clipSim,
      attributeSim,
      geoPlausibility,
      temporalPlausibility,
    },
    distanceKm,
    reasons: reasons.slice(0, 4),
  };
}

export function petReportToReIDFeatures(
  pet: PetReport,
  petface?: PetFaceEmbedding | null,
  visualClip?: VisualClipEmbedding | null,
  v2Meta?: { coat_colors?: string[]; coat_pattern?: string; size?: string; ear_type?: string } | null
): PetReIDFeatures {
  let colors: string[] = [];
  if (v2Meta && v2Meta.coat_colors && v2Meta.coat_colors.length > 0) {
    colors = [...v2Meta.coat_colors];
  } else {
    const text = `${pet.primary_color || ""} ${pet.secondary_color || ""} ${pet.distinctive_features || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (/\b(blanco|white)\b/.test(text)) colors.push("WHITE");
    if (/\b(negro|black|oscura|oscuro)\b/.test(text)) colors.push("BLACK");
    if (/\b(cafe|marron|brown|chocolate)\b/.test(text)) colors.push("BROWN");
    if (/\b(amarillo|dorado|golden|yellow|mono|mona)\b/.test(text)) colors.push("GOLDEN_YELLOW");
    if (/\b(gris|plomo|gray|silver)\b/.test(text)) colors.push("GRAY_SILVER");
    if (/\b(crema|beige|canela|arena)\b/.test(text)) colors.push("CREAM");
  }

  return {
    petId: pet.id || "TEMP",
    reportType: pet.report_type,
    species: pet.species,
    faceDetected: !!(petface && petface.confidence >= 0.5),
    petface: petface || null,
    visualClip: visualClip || null,
    canonicalAttributes: {
      species: pet.species,
      size: (pet.size as "PEQUEÑO" | "MEDIANO" | "GRANDE") || "MEDIANO",
      coat_colors: colors,
      coat_pattern: v2Meta?.coat_pattern || pet.pattern || undefined,
      ear_type: (v2Meta?.ear_type as any) || undefined,
      distinctive_markings: pet.distinctive_features ? [pet.distinctive_features] : [],
    },
    lat: pet.lat,
    lng: pet.lng,
    neighborhood: pet.neighborhood,
    timestamp: pet.created_at,
  };
}
