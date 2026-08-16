import { PetReport } from "./types";
import dinov2Embeddings from "@/data/dinov2_embeddings.json";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";
import legacyVisualFeatures from "@/data/visual_features_cache.json";

export interface MatchResult {
  pet: PetReport;
  score: number; // 0 to 100
  distanceKm: number;
  reasons: string[];
  visualSummary?: string | null;
}

export type SpeciesEnum = "DOG" | "CAT" | "OTHER" | "UNKNOWN";
export type SizeEnum = "SMALL" | "MEDIUM" | "LARGE" | "UNKNOWN";
export type FurLengthEnum = "SHORT" | "MEDIUM" | "LONG" | "HAIRLESS" | "UNKNOWN";
export type HeadShapeEnum = "POINTED_WEDGE" | "BROAD_FLAT" | "PRISMATIC_SQUARE" | "ROUND_DELICATE" | "UNKNOWN";
export type EarTypeEnum = "ERECT" | "FLOPPY" | "SEMI_ERECT" | "UNKNOWN";
export type BodyBuildEnum = "STURDY_PROPORTIONATE" | "HEAVY_MASSIVE" | "SLENDER_AERODYNAMIC" | "COMPACT_DWARF" | "TOY_MINIATURE" | "UNKNOWN";
export type CoatColorEnum = "BLACK" | "WHITE" | "BROWN" | "GOLDEN_YELLOW" | "GRAY_SILVER" | "CREAM" | "ORANGE_RED";
export type CoatPatternEnum = "SOLID" | "SPOTTED" | "STRIPED_TABBY" | "MERLE_BRINDLE" | "PATCHED_CALICO" | "BICOLOR_TUXEDO" | "POINTED_SIAMESE" | "UNKNOWN";

export interface PetMetadataV2 {
  species?: SpeciesEnum;
  size?: SizeEnum;
  fur_length?: FurLengthEnum;
  head_and_muzzle_shape?: HeadShapeEnum;
  ear_type?: EarTypeEnum;
  body_build?: BodyBuildEnum;
  coat_colors?: CoatColorEnum[];
  coat_pattern?: CoatPatternEnum;
  eye_color?: string;
  nose_color?: string;
  distinctive_features?: string[];
}

// Haversine distance in km
export function calculateDistanceKm(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 5.0;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Cosine similarity for DINOv2 vectors
export function cosineSimilarity(vecA?: number[], vecB?: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0.5;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

// Map color enums to friendly Spanish descriptions
const COLOR_NAMES: Record<CoatColorEnum, string> = {
  BLACK: "Negro",
  WHITE: "Blanco",
  BROWN: "Marrón",
  GOLDEN_YELLOW: "Amarillo/Miel",
  GRAY_SILVER: "Gris/Plomo",
  CREAM: "Crema",
  ORANGE_RED: "Naranja/Rubio",
};

const PATTERN_NAMES: Record<CoatPatternEnum, string> = {
  SOLID: "Sólido",
  SPOTTED: "Manchas",
  STRIPED_TABBY: "Rayas / Atigrado",
  MERLE_BRINDLE: "Abigarrado / Brindle",
  PATCHED_CALICO: "Calicó / Carey",
  BICOLOR_TUXEDO: "Bicolor / Tuxedo",
  POINTED_SIAMESE: "Siamés (Pointed)",
  UNKNOWN: "Mixto",
};

/**
 * Hybrid 50/50 Matching Engine:
 * 50% Discrete Enum Trait Comparison (Colors, Pattern, Shape, Ears, Build, Size)
 * 50% DINOv2 Self-Supervised Vision Transformer Embedding (Fine-grained texture & distribution)
 */
export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5
): MatchResult[] {
  const v2Cache = (visualFeaturesV2 as unknown) as Record<string, PetMetadataV2>;
  const dinoCache = (dinov2Embeddings as unknown) as Record<string, number[]>;
  const legacyCache = (legacyVisualFeatures as unknown) as Record<string, { search_summary?: string }>;

  const targetV2: PetMetadataV2 = v2Cache[targetPet.id || ""] || {};
  const targetDino: number[] | undefined = dinoCache[targetPet.id || ""];

  const searchInTypes =
    targetPet.report_type === "LOST"
      ? ["FOUND", "SHELTERED", "OBSERVED"]
      : ["LOST"];

  const results: MatchResult[] = [];

  for (const candidate of allPets) {
    // -------------------------------------------------------------
    // PASS 1: HARD DETERMINISTIC EXCLUSIONS (Zero Tolerance)
    // -------------------------------------------------------------
    if (candidate.id === targetPet.id) continue;
    if (candidate.species !== targetPet.species) continue;
    if (!searchInTypes.includes(candidate.report_type)) continue;

    // Hard biological sex filter
    if (
      targetPet.gender &&
      candidate.gender &&
      targetPet.gender !== "UNKNOWN" &&
      candidate.gender !== "UNKNOWN" &&
      targetPet.gender !== candidate.gender
    ) {
      continue;
    }

    const candidateV2: PetMetadataV2 = v2Cache[candidate.id || ""] || {};
    const candidateDino: number[] | undefined = dinoCache[candidate.id || ""];

    // Color list inspection
    const targetColors = targetV2.coat_colors || [];
    const candidateColors = candidateV2.coat_colors || [];

    // Strict Chromatic Spectrum Clash:
    // If target has ONLY Gray/Silver and candidate has ONLY Orange/Red (or vice versa)
    const isTargetPureOrange = targetColors.includes("ORANGE_RED") && !targetColors.includes("GRAY_SILVER") && !targetColors.includes("BLACK");
    const isCandidatePureGray = candidateColors.includes("GRAY_SILVER") && !candidateColors.includes("ORANGE_RED") && !candidateColors.includes("GOLDEN_YELLOW");
    if (isTargetPureOrange && isCandidatePureGray) continue;

    const isTargetPureGray = targetColors.includes("GRAY_SILVER") && !targetColors.includes("ORANGE_RED") && !targetColors.includes("GOLDEN_YELLOW");
    const isCandidatePureOrange = candidateColors.includes("ORANGE_RED") && !candidateColors.includes("GRAY_SILVER") && !candidateColors.includes("BLACK");
    if (isTargetPureGray && isCandidatePureOrange) continue;

    // Solid Black vs Solid White
    const isTargetSolidBlack = targetColors.length === 1 && targetColors[0] === "BLACK";
    const isCandidateSolidWhite = candidateColors.length === 1 && candidateColors[0] === "WHITE";
    if (isTargetSolidBlack && isCandidateSolidWhite) continue;

    // Morphology Head/Muzzle clash in dogs
    if (targetPet.species === "DOG") {
      if (targetV2.head_and_muzzle_shape === "POINTED_WEDGE" && candidateV2.head_and_muzzle_shape === "BROAD_FLAT") {
        continue;
      }
      if (targetV2.head_and_muzzle_shape === "BROAD_FLAT" && candidateV2.head_and_muzzle_shape === "POINTED_WEDGE") {
        continue;
      }
    }

    // -------------------------------------------------------------
    // KEY PARAMETER: USER-DEFINED SIZE FILTERING & EXCLUSION
    // A small dog (e.g., Dachshund / Frenchie) cannot match a large dog (e.g., German Shepherd / Mastiff)
    // -------------------------------------------------------------
    const normalizeSize = (s?: string) => {
      if (!s) return "UNKNOWN";
      const upper = s.toUpperCase();
      if (upper.includes("PEQUEÑO") || upper.includes("SMALL") || upper.includes("MINI") || upper.includes("ENANO")) return "SMALL";
      if (upper.includes("GRANDE") || upper.includes("LARGE") || upper.includes("GIGANTE")) return "LARGE";
      if (upper.includes("MEDIANO") || upper.includes("MEDIUM")) return "MEDIUM";
      return "UNKNOWN";
    };

    const targetSize = normalizeSize(targetPet.size) !== "UNKNOWN" ? normalizeSize(targetPet.size) : normalizeSize(targetV2.size);
    const candidateSize = normalizeSize(candidate.size) !== "UNKNOWN" ? normalizeSize(candidate.size) : normalizeSize(candidateV2.size);

    if (targetSize !== "UNKNOWN" && candidateSize !== "UNKNOWN") {
      // Hard rule: SMALL vs LARGE is an absolute exclusion
      if (targetSize === "SMALL" && candidateSize === "LARGE") continue;
      if (targetSize === "LARGE" && candidateSize === "SMALL") continue;
    }

    // -------------------------------------------------------------
    // PASS 2: 50% DISCRETE CHARACTERISTICS COMPARISON
    // -------------------------------------------------------------
    let charScore = 0; // Max 50 points
    const reasons: string[] = [];

    // 1. Color overlap (Max 22 pts)
    if (targetColors.length > 0 && candidateColors.length > 0) {
      const commonColors = targetColors.filter((c) => candidateColors.includes(c));
      if (commonColors.length > 0) {
        const jaccard = commonColors.length / new Set([...targetColors, ...candidateColors]).size;
        const pts = Math.round(jaccard * 22);
        charScore += pts;
        const colorLabels = commonColors.map((c) => COLOR_NAMES[c] || c).join(", ");
        reasons.push(`🎨 Colores coincidentes: ${colorLabels}`);
      }
    } else {
      charScore += 8; // Neutral if missing
    }

    // 2. Coat Pattern (Max 10 pts)
    if (targetV2.coat_pattern && candidateV2.coat_pattern && targetV2.coat_pattern !== "UNKNOWN" && targetV2.coat_pattern === candidateV2.coat_pattern) {
      charScore += 10;
      reasons.push(`✨ Patrón de pelaje (${PATTERN_NAMES[targetV2.coat_pattern] || targetV2.coat_pattern})`);
    }

    // 3. Head & Muzzle Shape (Max 6 pts)
    if (targetV2.head_and_muzzle_shape && candidateV2.head_and_muzzle_shape && targetV2.head_and_muzzle_shape !== "UNKNOWN" && targetV2.head_and_muzzle_shape === candidateV2.head_and_muzzle_shape) {
      charScore += 6;
      reasons.push(`📐 Estructura craneal coincidente`);
    }

    // 4. Ear Type (Max 5 pts)
    if (targetV2.ear_type && candidateV2.ear_type && targetV2.ear_type !== "UNKNOWN" && targetV2.ear_type === candidateV2.ear_type) {
      charScore += 5;
      reasons.push(`👂 Orejas coincidentes`);
    }

    // 5. Body Build & Size (Max 4 pts)
    if (targetV2.body_build && candidateV2.body_build && targetV2.body_build !== "UNKNOWN" && targetV2.body_build === candidateV2.body_build) {
      charScore += 4;
    }

    // 6. Fur Length (Max 3 pts)
    if (targetV2.fur_length && candidateV2.fur_length && targetV2.fur_length !== "UNKNOWN" && targetV2.fur_length === candidateV2.fur_length) {
      charScore += 3;
    }

    // -------------------------------------------------------------
    // PASS 3: 50% DINOv2 VISUAL SIMILARITY (Fine-Grained Texture)
    // -------------------------------------------------------------
    let dinoScore = 25; // default neutral 50% of 50
    if (targetDino && candidateDino) {
      const sim = cosineSimilarity(targetDino, candidateDino);
      // Scale from [0.5, 1.0] cosine to [0, 50] points
      dinoScore = Math.max(0, Math.min(50, Math.round(((sim - 0.45) / 0.55) * 50)));
      if (sim >= 0.75) {
        reasons.push(`👁️ Gran similitud visual y textura DINOv2 (${Math.round(sim * 100)}%)`);
      }
    }

    // Proximity Bonus in Cali (Optional Geo context)
    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );
    if (distanceKm <= 3.0) {
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    }

    // TOTAL 50/50 COMPOSITE SCORE (0 - 100)
    const totalScore = Math.min(99, Math.max(10, charScore + dinoScore));

    if (totalScore >= 30) {
      results.push({
        pet: candidate,
        score: totalScore,
        distanceKm,
        reasons: reasons.slice(0, 3),
        visualSummary: legacyCache[candidate.id || ""]?.search_summary || null,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
