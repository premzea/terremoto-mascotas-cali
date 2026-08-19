import { PetReport } from "./types";
import dinov2Embeddings from "@/data/dinov2_embeddings.json";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";
import legacyVisualFeatures from "@/data/visual_features_cache.json";
import { petReportToReIDFeatures, scorePetReIDPair } from "./reid/petface-engine";

export type MatchingAlgorithmMode = "V2_MULTIMODAL" | "V1_CLASSIC";

export interface MatchResult {
  pet: PetReport;
  score: number; // 0 to 100
  distanceKm: number;
  reasons: string[];
  visualSummary?: string | null;
  algorithmUsed?: MatchingAlgorithmMode;
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
  GOLDEN_YELLOW: "Dorado / Amarillo",
  GRAY_SILVER: "Gris",
  CREAM: "Crema / Beige",
  ORANGE_RED: "Naranja / Rojizo",
};

const PATTERN_NAMES: Record<CoatPatternEnum, string> = {
  SOLID: "Color Sólido",
  SPOTTED: "Manchas / Pecas",
  STRIPED_TABBY: "Atigrado / Rayas",
  MERLE_BRINDLE: "Abigarrado / Brindle",
  PATCHED_CALICO: "Calicó / Parches",
  BICOLOR_TUXEDO: "Bicolor / Pechera blanca",
  POINTED_SIAMESE: "Siamés / Puntas oscuras",
  UNKNOWN: "Estándar",
};

function normalizeSize(s?: string): SizeEnum {
  if (!s) return "UNKNOWN";
  const up = s.toUpperCase();
  if (up.includes("PEQUE") || up.includes("SMALL")) return "SMALL";
  if (up.includes("GRAND") || up.includes("LARGE")) return "LARGE";
  if (up.includes("MEDIAN") || up.includes("MEDIUM")) return "MEDIUM";
  return "UNKNOWN";
}

export type ColorFamily = "GINGER_WARM" | "DARK" | "LIGHT" | "GRAY" | "BROWN";

export function getColorFamily(color?: CoatColorEnum): ColorFamily {
  switch (color) {
    case "GOLDEN_YELLOW":
    case "ORANGE_RED":
      return "GINGER_WARM";
    case "BLACK":
      return "DARK";
    case "BROWN":
      return "BROWN";
    case "WHITE":
    case "CREAM":
      return "LIGHT";
    case "GRAY_SILVER":
      return "GRAY";
    default:
      return "DARK";
  }
}

export function areColorsCompatible(c1?: CoatColorEnum, c2?: CoatColorEnum): boolean {
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  return getColorFamily(c1) === getColorFamily(c2);
}

function extractColorsFromPet(pet: PetReport, v2Meta?: PetMetadataV2): CoatColorEnum[] {
  if (v2Meta && v2Meta.coat_colors && v2Meta.coat_colors.length > 0) {
    return v2Meta.coat_colors;
  }
  const text = `${pet.primary_color || ""} ${pet.secondary_color || ""} ${pet.distinctive_features || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const colorPatterns: { color: CoatColorEnum; regex: RegExp }[] = [
    { color: "BLACK", regex: /\b(negro|black|oscura|oscuro|azabache)\b/ },
    { color: "WHITE", regex: /\b(blanco|white|nieve|claro)\b/ },
    { color: "BROWN", regex: /\b(cafe|marron|brown|chocolate|tabaco)\b/ },
    { color: "GOLDEN_YELLOW", regex: /\b(amarillo|dorado|golden|yellow|mono|mona|rubio)\b/ },
    { color: "ORANGE_RED", regex: /\b(naranja|rojizo|red|orange|miel|caramelo|garfield)\b/ },
    { color: "GRAY_SILVER", regex: /\b(gris|plomo|gray|silver|ceniza)\b/ },
    { color: "CREAM", regex: /\b(crema|beige|canela|arena|marfil)\b/ },
  ];

  const foundWithIndices: { color: CoatColorEnum; index: number }[] = [];
  for (const { color, regex } of colorPatterns) {
    const match = text.match(regex);
    if (match && match.index !== undefined) {
      foundWithIndices.push({ color, index: match.index });
    }
  }

  // Sort by order of appearance in the text so dominant color is first
  foundWithIndices.sort((a, b) => a.index - b.index);
  return Array.from(new Set(foundWithIndices.map((item) => item.color)));
}

function extractPatternFromPet(pet: PetReport, v2Meta?: PetMetadataV2): CoatPatternEnum {
  if (v2Meta && v2Meta.coat_pattern && v2Meta.coat_pattern !== "UNKNOWN") {
    return v2Meta.coat_pattern;
  }
  const text = `${pet.pattern || ""} ${pet.distinctive_features || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\b(atigrado|rayas|tabby|garfield)\b/.test(text)) return "STRIPED_TABBY";
  if (/\b(manchas|spotted|pecas|moteado|parches)\b/.test(text)) return "SPOTTED";
  if (/\b(calico|carey)\b/.test(text)) return "PATCHED_CALICO";
  if (/\b(siames|puntas)\b/.test(text)) return "POINTED_SIAMESE";
  if (/\b(brindle|abigarrado)\b/.test(text)) return "MERLE_BRINDLE";
  if (/\b(bicolor|pechera|calcetines|tuxedo|canas)\b/.test(text)) return "BICOLOR_TUXEDO";
  if (/\b(solido|liso|uniforme)\b/.test(text)) return "SOLID";

  return "UNKNOWN";
}

/**
 * Tri-Factor Multimodal Matching Engine:
 * Combines high-dimensional foundation vision embeddings (DINOv2, 768-d),
 * structured morphological attributes (Gemini V2: color families, ears, muzzle, patterns),
 * and continuous exponential geospatial decay (Haversine e^(-d/8km)).
 */
export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5,
  algorithmMode: MatchingAlgorithmMode = "V2_MULTIMODAL",
  minScoreThreshold = 60
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

  // V2 Multimodal ReID features
  const targetReID = algorithmMode === "V2_MULTIMODAL"
    ? petReportToReIDFeatures(
        targetPet,
        null,
        targetDino ? { vector: targetDino, model: "DINOv2_BASE" } : null,
        targetV2
      )
    : null;

  for (const candidate of allPets) {
    // -------------------------------------------------------------
    // PASS 1: HARD DETERMINISTIC EXCLUSIONS (Shared by all modes)
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

    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );

    // -------------------------------------------------------------
    // MODE EXECUTION: V2_MULTIMODAL vs V1_CLASSIC
    // -------------------------------------------------------------
    if (algorithmMode === "V2_MULTIMODAL" && targetReID) {
      const candidateReID = petReportToReIDFeatures(
        candidate,
        null,
        candidateDino ? { vector: candidateDino, model: "DINOv2_BASE" } : null,
        candidateV2
      );

      const reidMatch = scorePetReIDPair(targetReID, candidateReID, candidate);
      if (reidMatch && reidMatch.totalScore >= minScoreThreshold) {
        results.push({
          pet: candidate,
          score: reidMatch.totalScore,
          distanceKm: reidMatch.distanceKm,
          reasons: reidMatch.reasons.slice(0, 3),
          visualSummary: legacyCache[candidate.id || ""]?.search_summary || null,
          algorithmUsed: "V2_MULTIMODAL",
        });
      }
      continue;
    }

    // -------------------------------------------------------------
    // V1_CLASSIC: Linear multi-factor with dominant color polarity & synonym families
    // -------------------------------------------------------------
    let score = 0;
    const reasons: string[] = [];

    // 1. Dominant-Aware & Synonym Color Matching (Max 35 pts)
    const domTarget = targetColors[0];
    const secTarget = targetColors[1] || null;
    const domCandidate = candidateColors[0];
    const secCandidate = candidateColors[1] || null;

    if (targetColors.length > 0 && candidateColors.length > 0) {
      if (domTarget && domCandidate && areColorsCompatible(domTarget, domCandidate)) {
        // Case 1: Same primary dominant base color or compatible color family
        let colorPts = domTarget === domCandidate ? 25 : 22;
        if (secTarget && secCandidate && areColorsCompatible(secTarget, secCandidate)) {
          colorPts = 35; // Both dominant and accent match
          reasons.push(`🎨 Pelaje base y acento compatibles (${COLOR_NAMES[domTarget]} + ${COLOR_NAMES[secTarget]})`);
        } else if (secTarget && candidateColors.some((c) => areColorsCompatible(secTarget, c))) {
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
        score += 5;
      } else if (targetColors.some((tc) => candidateColors.some((cc) => areColorsCompatible(tc, cc)))) {
        // Case 3: Partial accent match without direct opposite polarity
        const common = targetColors.filter((tc) => candidateColors.some((cc) => areColorsCompatible(tc, cc)));
        const colorLabels = common.map((c) => COLOR_NAMES[c] || c).join(", ");
        score += 12;
        reasons.push(`🎨 Coincidencia parcial de color: ${colorLabels}`);
      } else {
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

    // Only include meaningful candidates with confidence >= minScoreThreshold (default 50%)
    if (finalScore >= minScoreThreshold) {
      results.push({
        pet: candidate,
        score: finalScore,
        distanceKm,
        reasons: reasons.slice(0, 3),
        visualSummary: legacyCache[candidate.id || ""]?.search_summary || null,
        algorithmUsed: "V1_CLASSIC",
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
