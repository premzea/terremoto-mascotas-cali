import { PetReport } from "./types";
import embeddingsCache from "@/data/embeddings_cache.json";
import visualFeaturesCache from "@/data/visual_features_cache.json";

export interface MatchResult {
  pet: PetReport;
  score: number; // 0 to 100
  distanceKm: number;
  reasons: string[];
  visualSummary?: string | null;
}

export interface VisualTrait {
  species?: string | null;
  breed_likely?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  coat_pattern?: string | null;
  ear_type?: string | null;
  fur_length?: string | null;
  distinctive_marks?: string | null;
  search_summary?: string | null;
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

// Cosine similarity
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

// Extract dominant color keywords
function getDominantColors(text?: string | null): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found: string[] = [];
  const colorMap = ["negro", "blanco", "cafe", "marron", "marrón", "amarillo", "miel", "naranja", "gris", "dorado", "canela"];
  for (const c of colorMap) {
    if (lower.includes(c)) found.push(c.replace("marrón", "marron"));
  }
  return found;
}

export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5
): MatchResult[] {
  const cache = embeddingsCache as Record<string, number[]>;
  const vCache = (visualFeaturesCache as unknown) as Record<string, VisualTrait>;

  const targetVector = cache[targetPet.id || ""] || [];
  const targetVisual: VisualTrait = vCache[targetPet.id || ""] || {};
  const targetColors = getDominantColors(`${targetVisual.primary_color || ""} ${targetPet.primary_color || ""}`);

  const searchInTypes =
    targetPet.report_type === "LOST"
      ? ["FOUND", "SHELTERED", "OBSERVED"]
      : ["LOST"];

  const results: MatchResult[] = [];

  for (const candidate of allPets) {
    // 1. Hard filters
    if (candidate.id === targetPet.id) continue;
    if (candidate.species !== targetPet.species) continue;
    if (!searchInTypes.includes(candidate.report_type)) continue;

    const candidateVisual: VisualTrait = vCache[candidate.id || ""] || {};
    const candidateVector = cache[candidate.id || ""] || [];
    const candidateColors = getDominantColors(`${candidateVisual.primary_color || ""} ${candidate.primary_color || ""}`);

    // 2. Color Compatibility & Clash Detection
    let colorBonus = 0;
    let isColorClash = false;

    if (targetColors.length > 0 && candidateColors.length > 0) {
      const hasColorOverlap = targetColors.some((tc) => candidateColors.includes(tc));
      if (hasColorOverlap) {
        colorBonus += 0.25;
      } else {
        // Direct clash (e.g. solid black vs solid white)
        if (
          (targetColors.includes("negro") && candidateColors.includes("blanco") && !candidateColors.includes("negro")) ||
          (targetColors.includes("blanco") && candidateColors.includes("negro") && !candidateColors.includes("blanco"))
        ) {
          isColorClash = true;
        }
      }
    }

    // 3. Vector Similarity
    const sim = targetVector.length && candidateVector.length ? cosineSimilarity(targetVector, candidateVector) : 0.3;

    // 4. Geographic Distance in Cali
    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );
    const geoScore = Math.max(0, 1 - distanceKm / 15);

    // 5. Visual Traits Alignment & Explanations
    const reasons: string[] = [];

    // Species
    reasons.push(targetPet.species === "DOG" ? "🐶 Perro" : "🐱 Gato");

    // Color match
    if (targetColors.length > 0 && candidateColors.length > 0 && targetColors.some((tc) => candidateColors.includes(tc))) {
      reasons.push(`🎨 Mismo tono visual (${candidateVisual.primary_color || candidateColors.join(", ")})`);
    }

    // Ear structure match
    if (targetVisual.ear_type && candidateVisual.ear_type && targetVisual.ear_type === candidateVisual.ear_type) {
      reasons.push(`👂 Orejas coincidentes (${targetVisual.ear_type.toLowerCase()})`);
    }

    // Breed similarity
    if (targetVisual.breed_likely && candidateVisual.breed_likely) {
      const bTarget = targetVisual.breed_likely.toLowerCase();
      const bCand = candidateVisual.breed_likely.toLowerCase();
      if (bTarget.includes("pastor") && bCand.includes("pastor")) {
        reasons.push("🐾 Tipo de raza compatible (Pastor)");
        colorBonus += 0.20;
      } else if (bTarget.split(" ")[0] === bCand.split(" ")[0] && bTarget.split(" ")[0] !== "criollo") {
        reasons.push(`🐾 Raza compatible (${candidateVisual.breed_likely})`);
        colorBonus += 0.15;
      }
    }

    // Distance explanation
    if (distanceKm <= 3.0) {
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 7.0) {
      reasons.push(`📍 A ${distanceKm} km en ${candidate.neighborhood}`);
    }

    // 6. Compute Multi-Factor Final Score
    let rawScore = 0.55 * sim + 0.30 * geoScore + 0.15 * colorBonus;

    // Heavy penalty for color clash (e.g. solid white dog when searching black dog)
    if (isColorClash) {
      rawScore *= 0.35; // 65% penalty
    }

    const finalScore = Math.min(99, Math.max(15, Math.round(rawScore * 100)));

    results.push({
      pet: candidate,
      score: finalScore,
      distanceKm,
      reasons: reasons.slice(0, 3),
      visualSummary: candidateVisual.search_summary,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
