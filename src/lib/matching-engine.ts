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

function extractColorsFromPet(pet: PetReport, v2Data?: PetMetadataV2): CoatColorEnum[] {
  if (v2Data?.coat_colors && v2Data.coat_colors.length > 0) {
    return v2Data.coat_colors;
  }
  const text = `${pet.primary_color || ""} ${pet.secondary_color || ""} ${pet.distinctive_features || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const colors: CoatColorEnum[] = [];
  if (/negro|black|oscuro|azabache/.test(text)) colors.push("BLACK");
  if (/blanco|white|claro|nieve/.test(text)) colors.push("WHITE");
  if (/cafe|marron|brown|chocolate|canela|tabaco/.test(text)) colors.push("BROWN");
  if (/amarillo|dorado|miel|golden|rubio|yellow|oro/.test(text)) colors.push("GOLDEN_YELLOW");
  if (/gris|plomo|plateado|silver|gray|grey|ceniza/.test(text)) colors.push("GRAY_SILVER");
  if (/crema|beige|cream|arena|marfil/.test(text)) colors.push("CREAM");
  if (/naranja|rojizo|orange|rojo|red|caramelo/.test(text)) colors.push("ORANGE_RED");
  return colors;
}

function extractPatternFromPet(pet: PetReport, v2Data?: PetMetadataV2): CoatPatternEnum {
  if (v2Data?.coat_pattern && v2Data.coat_pattern !== "UNKNOWN") {
    return v2Data.coat_pattern;
  }
  const text = `${pet.pattern || ""} ${pet.distinctive_features || ""} ${pet.primary_color || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/mancha|spotted|pecas|pintas/.test(text)) return "SPOTTED";
  if (/raya|atigrado|tabby|rayado|tigre/.test(text)) return "STRIPED_TABBY";
  if (/brindle|abigarrado|merle/.test(text)) return "MERLE_BRINDLE";
  if (/calico|carey|tricolor/.test(text)) return "PATCHED_CALICO";
  if (/tuxedo|bicolor|pecho blanco/.test(text)) return "BICOLOR_TUXEDO";
  if (/siames|pointed/.test(text)) return "POINTED_SIAMESE";
  if (/solido|un solo color|parejo/.test(text)) return "SOLID";
  return "UNKNOWN";
}

function normalizeSize(s?: string): "SMALL" | "MEDIUM" | "LARGE" | "UNKNOWN" {
  if (!s) return "UNKNOWN";
  const upper = s.toUpperCase();
  if (upper.includes("PEQUEÑO") || upper.includes("SMALL") || upper.includes("MINI") || upper.includes("ENANO")) return "SMALL";
  if (upper.includes("GRANDE") || upper.includes("LARGE") || upper.includes("GIGANTE")) return "LARGE";
  if (upper.includes("MEDIANO") || upper.includes("MEDIUM")) return "MEDIUM";
  return "UNKNOWN";
}

/**
 * Hybrid Intelligent Matching Engine:
 * Dynamically compares live reports against all database records using:
 * 1. Multi-spectral chromatic similarity (Colors Jaccard)
 * 2. Breed & distinctive traits keyword extraction
 * 3. Coat pattern & morphology
 * 4. Size compatibility
 * 5. Spatial proximity across Cali neighborhoods
 * 6. DINOv2 vision embeddings when available
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

  const targetColors = extractColorsFromPet(targetPet, targetV2);
  const targetPattern = extractPatternFromPet(targetPet, targetV2);
  const targetSize = normalizeSize(targetPet.size) !== "UNKNOWN" ? normalizeSize(targetPet.size) : normalizeSize(targetV2.size);

  const searchInTypes =
    targetPet.report_type === "LOST"
      ? ["FOUND", "SHELTERED", "OBSERVED"]
      : ["LOST"];

  const results: MatchResult[] = [];

  for (const candidate of allPets) {
    // -------------------------------------------------------------
    // PASS 1: HARD DETERMINISTIC EXCLUSIONS
    // -------------------------------------------------------------
    if (candidate.id === targetPet.id) continue;
    if (candidate.species !== targetPet.species) continue;
    if (!searchInTypes.includes(candidate.report_type)) continue;

    // Biological sex exclusion (only if both are explicitly known)
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
    const candidateColors = extractColorsFromPet(candidate, candidateV2);
    const candidatePattern = extractPatternFromPet(candidate, candidateV2);
    const candidateSize = normalizeSize(candidate.size) !== "UNKNOWN" ? normalizeSize(candidate.size) : normalizeSize(candidateV2.size);

    // Hard Size Exclusion: Small vs Large is incompatible
    if (targetSize !== "UNKNOWN" && candidateSize !== "UNKNOWN") {
      if (targetSize === "SMALL" && candidateSize === "LARGE") continue;
      if (targetSize === "LARGE" && candidateSize === "SMALL") continue;
    }

    // -------------------------------------------------------------
    // PASS 2: MULTI-FACTOR TRAIT & COLOR SIMILARITY
    // -------------------------------------------------------------
    let score = 0;
    const reasons: string[] = [];

    // 1. Dominant-Aware & Polarity Color Matching (Max 35 pts)
    const domTarget = targetColors[0] || "UNKNOWN";
    const secTarget = targetColors[1] || null;
    const domCandidate = candidateColors[0] || "UNKNOWN";
    const secCandidate = candidateColors[1] || null;

    if (targetColors.length > 0 && candidateColors.length > 0) {
      if (domTarget === domCandidate && domTarget !== "UNKNOWN") {
        // Case 1: Same primary dominant base color (e.g. Both mostly White, or both mostly Black)
        let colorPts = 25;
        if (secTarget && secCandidate && secTarget === secCandidate) {
          colorPts = 35; // Both dominant and accent match exactly
          reasons.push(`🎨 Pelaje base y acento idénticos (${COLOR_NAMES[domTarget]} + ${COLOR_NAMES[secTarget]})`);
        } else if (secTarget && candidateColors.includes(secTarget)) {
          colorPts = 30;
          reasons.push(`🎨 Mismo color base (${COLOR_NAMES[domTarget]}) y acento coincidente`);
        } else {
          reasons.push(`🎨 Mismo color base dominante: ${COLOR_NAMES[domTarget]}`);
        }
        score += colorPts;
      } else if (
        (domTarget === "WHITE" && domCandidate === "BLACK") ||
        (domTarget === "BLACK" && domCandidate === "WHITE")
      ) {
        // Case 2: Inverted Dominance (Opposite polarity: Mostly White vs Mostly Black)
        // Heavy reduction: only 5 pts even if they share an accent spot
        score += 5;
      } else if (targetColors.some((c) => candidateColors.includes(c))) {
        // Case 3: Partial accent match without direct opposite polarity
        const common = targetColors.filter((c) => candidateColors.includes(c));
        const colorLabels = common.map((c) => COLOR_NAMES[c] || c).join(", ");
        score += 12;
        reasons.push(`🎨 Coincidencia parcial de color: ${colorLabels}`);
      } else {
        // Complete mismatch
        score += 0;
      }
    } else {
      score += 15; // Neutral baseline when color not recorded
    }

    // 2. Pattern Matching (Max 12 pts)
    if (targetPattern !== "UNKNOWN" && candidatePattern !== "UNKNOWN") {
      if (targetPattern === candidatePattern) {
        score += 12;
        reasons.push(`✨ Patrón coincidente: ${PATTERN_NAMES[targetPattern] || targetPattern}`);
      } else if (
        (targetPattern === "SPOTTED" && candidatePattern === "BICOLOR_TUXEDO") ||
        (targetPattern === "BICOLOR_TUXEDO" && candidatePattern === "SPOTTED")
      ) {
        // Pattern conflict: Spotted/Piebald vs Tuxedo
        score -= 5;
      }
    }

    // 3. Breed & Distinctive Keywords Match (Max 30 pts)
    const targetFeatures = `${targetPet.distinctive_features || ""} ${targetPet.name || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const candidateFeatures = `${candidate.distinctive_features || ""} ${candidate.name || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const breedsAndTraits = [
      "pastor holandes", "holandes", "pastor", "belga", "aleman", "pitbull", "golden",
      "labrador", "poodle", "caniche", "husky", "siberiano", "pincher", "chihuahua",
      "beagle", "schnauzer", "criollo", "mestizo", "siames", "persa", "angora",
      "bengali", "carey", "calico", "collar", "placa", "orejas erectas", "orejas caidas",
      "cola corta", "manchas", "pecho blanco", "ojos claros", "ojos negro", "pelaje corto",
      "castrado", "castrada", "esterilizada"
    ];

    const matchedTraits: string[] = [];
    for (const kw of breedsAndTraits) {
      if (targetFeatures.includes(kw) && candidateFeatures.includes(kw)) {
        matchedTraits.push(kw);
      }
    }

    if (matchedTraits.length > 0) {
      const traitPts = Math.min(30, matchedTraits.length * 15);
      score += traitPts;
      reasons.push(`🏷️ Rasgo compartido: ${matchedTraits.slice(0, 2).join(", ")}`);
    }

    // 4. Gender Match (Max 10 pts)
    if (
      targetPet.gender &&
      candidate.gender &&
      targetPet.gender !== "UNKNOWN" &&
      candidate.gender !== "UNKNOWN" &&
      targetPet.gender === candidate.gender
    ) {
      score += 10;
      reasons.push(`⚧️ Mismo sexo (${targetPet.gender === "HEMBRA" ? "Hembra" : "Macho"})`);
    }

    // 5. Size Compatibility (Max 8 pts)
    if (targetSize !== "UNKNOWN" && candidateSize !== "UNKNOWN") {
      if (targetSize === candidateSize) {
        score += 8;
        reasons.push(`📏 Mismo tamaño (${targetSize === "SMALL" ? "Pequeño" : targetSize === "LARGE" ? "Grande" : "Mediano"})`);
      } else {
        score += 4; // Adjacent size (e.g. Small / Medium)
      }
    } else {
      score += 4;
    }

    // 6. Geographic Proximity in Cali (Max 20 pts)
    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );

    const normTargetBarrio = (targetPet.neighborhood || "").trim().toLowerCase();
    const normCandidateBarrio = (candidate.neighborhood || "").trim().toLowerCase();

    if (normTargetBarrio && normCandidateBarrio && (normTargetBarrio === normCandidateBarrio || normTargetBarrio.includes(normCandidateBarrio) || normCandidateBarrio.includes(normTargetBarrio))) {
      score += 20;
      reasons.push(`📍 Mismo barrio: ${candidate.neighborhood}`);
    } else if (distanceKm <= 2.0) {
      score += 15;
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 4.5) {
      score += 8;
      reasons.push(`📍 En zona cercana (${distanceKm} km)`);
    }

    // 7. DINOv2 Visual Embedding (Max 15 pts)
    if (targetDino && candidateDino) {
      const sim = cosineSimilarity(targetDino, candidateDino);
      const dinoPts = Math.max(0, Math.min(15, Math.round(((sim - 0.45) / 0.55) * 15)));
      score += dinoPts;
      if (sim >= 0.75) {
        reasons.push(`👁️ Similitud visual DINOv2 (${Math.round(sim * 100)}%)`);
      }
    } else {
      // Scale proportionally if embeddings not generated yet
      score = Math.round(score * 1.1);
    }

    // Normalized Final Score (Bounded 15% - 98%)
    const finalScore = Math.min(98, Math.max(15, score));

    // Only include meaningful candidates with positive score
    if (finalScore >= 35) {
      results.push({
        pet: candidate,
        score: finalScore,
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
