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

  // 1. Coat colors (Max 40 pts)
  maxPoints += 40;
  const colorsA = attrA.coat_colors.map((c) => c.toLowerCase());
  const colorsB = attrB.coat_colors.map((c) => c.toLowerCase());
  if (colorsA.length > 0 && colorsB.length > 0) {
    const common = colorsA.filter((c) => colorsB.includes(c));
    if (common.length > 0) {
      const jaccard = common.length / new Set([...colorsA, ...colorsB]).size;
      scorePoints += jaccard * 40;
      matchedReasons.push(`🎨 Coincidencia de color: ${common.join(", ")}`);
    }
  } else {
    scorePoints += 15; // Neutral baseline
  }

  // 2. Breed / Morphological category (Max 25 pts)
  maxPoints += 25;
  if (attrA.breed && attrB.breed) {
    const bA = attrA.breed.toLowerCase();
    const bB = attrB.breed.toLowerCase();
    if (bA === bB || bA.includes(bB) || bB.includes(bA)) {
      scorePoints += 25;
      matchedReasons.push(`🏷️ Raza / morfología: ${attrA.breed}`);
    } else {
      scorePoints += 5;
    }
  } else {
    scorePoints += 10;
  }

  // 3. Body Size (Max 15 pts)
  maxPoints += 15;
  if (attrA.size === attrB.size) {
    scorePoints += 15;
    matchedReasons.push(`📏 Mismo tamaño (${attrA.size.toLowerCase()})`);
  } else if (
    (attrA.size === "MEDIANO" && (attrB.size === "PEQUEÑO" || attrB.size === "GRANDE")) ||
    (attrB.size === "MEDIANO" && (attrA.size === "PEQUEÑO" || attrA.size === "GRANDE"))
  ) {
    scorePoints += 8; // Adjacent size
  }

  // 4. Ears & Tail Shape (Max 10 pts)
  maxPoints += 10;
  if (attrA.ear_type && attrB.ear_type && attrA.ear_type !== "UNKNOWN" && attrA.ear_type === attrB.ear_type) {
    scorePoints += 5;
    matchedReasons.push(`👂 Mismo tipo de orejas (${attrA.ear_type.toLowerCase()})`);
  }
  if (attrA.tail_type && attrB.tail_type && attrA.tail_type !== "UNKNOWN" && attrA.tail_type === attrB.tail_type) {
    scorePoints += 5;
  }

  // 5. Distinctive Markings Overlap (Max 10 pts)
  maxPoints += 10;
  if (attrA.distinctive_markings.length > 0 && attrB.distinctive_markings.length > 0) {
    const marksA = attrA.distinctive_markings.join(" ").toLowerCase();
    const marksB = attrB.distinctive_markings.join(" ").toLowerCase();
    const sharedWords = marksA
      .split(/\s+/)
      .filter((w) => w.length > 3 && marksB.includes(w));
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
 * Core 5-Factor Multimodal Matching Engine:
 * Dynamically scores a candidate against a target using PetFace biometrics,
 * whole-body DINOv2 / OpenCLIP embeddings, structured Gemini attributes, and geography.
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

/**
 * Transforms a standard PetReport into canonical PetReIDFeatures.
 */
export function petReportToReIDFeatures(
  pet: PetReport,
  petface?: PetFaceEmbedding | null,
  visualClip?: VisualClipEmbedding | null
): PetReIDFeatures {
  const colors: string[] = [];
  if (pet.primary_color) colors.push(pet.primary_color);
  if (pet.secondary_color) colors.push(pet.secondary_color);

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
      coat_pattern: pet.pattern || undefined,
      distinctive_markings: pet.distinctive_features ? [pet.distinctive_features] : [],
    },
    lat: pet.lat,
    lng: pet.lng,
    neighborhood: pet.neighborhood,
    timestamp: pet.created_at,
  };
}
