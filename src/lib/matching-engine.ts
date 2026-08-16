import { PetReport } from "./types";
import embeddingsCache from "@/data/embeddings_cache.json";

export interface MatchResult {
  pet: PetReport;
  score: number; // 0 to 100
  distanceKm: number;
  reasons: string[];
}

// Haversine formula to compute distance in km between two GPS points
export function calculateDistanceKm(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 5.0; // Default distance if coords missing
  }

  const R = 6371; // Earth radius in km
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

// Cosine similarity between two unit vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

// Generate vector dynamically for a new report submitted on the client
export function generateClientVector(pet: PetReport): number[] {
  const cache = embeddingsCache as Record<string, number[]>;
  if (pet.id && cache[pet.id]) {
    return cache[pet.id];
  }

  // Fallback simple bag of words if new local pet
  const sampleVector = cache["B1"] || [];
  const dim = sampleVector.length || 95;
  const vec = new Array(dim).fill(0);

  const text = `${pet.name} ${pet.species} ${pet.primary_color} ${pet.pattern || ""} ${pet.size || ""} ${pet.distinctive_features || ""} ${pet.neighborhood}`.toLowerCase();
  
  // Basic hash projection
  const words = text.split(/\s+/);
  for (const w of words) {
    if (w.length >= 3) {
      let hash = 0;
      for (let i = 0; i < w.length; i++) {
        hash = (hash << 5) - hash + w.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1.0;
    }
  }

  const norm = Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0));
  if (norm > 0) {
    return vec.map((v) => v / norm);
  }
  return vec;
}

export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5
): MatchResult[] {
  const cache = embeddingsCache as Record<string, number[]>;
  const targetVector = cache[targetPet.id || ""] || generateClientVector(targetPet);

  // Determine target search pool:
  // If target is LOST, search in FOUND/SHELTERED/OBSERVED
  // If target is FOUND/SHELTERED, search in LOST
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

    // 2. Vector Similarity
    const candidateVector = cache[candidate.id || ""] || generateClientVector(candidate);
    const sim = cosineSimilarity(targetVector, candidateVector);

    // 3. Geographic Distance in Cali
    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );

    // Geo score: 1.0 at 0km, linear decay up to 15km in Cali
    const geoScore = Math.max(0, 1 - distanceKm / 15);

    // 4. Attribute alignment bonus
    let attrBonus = 0;
    const reasons: string[] = [];

    // Species
    reasons.push(targetPet.species === "DOG" ? "Misma especie (Perro)" : "Misma especie (Gato)");

    // Distance
    if (distanceKm <= 3.0) {
      reasons.push(`Muy cercano: a ${distanceKm} km en ${candidate.neighborhood}`);
      attrBonus += 0.15;
    } else if (distanceKm <= 7.0) {
      reasons.push(`En el mismo sector: a ${distanceKm} km`);
      attrBonus += 0.08;
    }

    // Color / features overlap
    const targetFeatures = `${targetPet.primary_color} ${targetPet.distinctive_features || ""}`.toLowerCase();
    const candidateFeatures = `${candidate.primary_color} ${candidate.distinctive_features || ""}`.toLowerCase();
    
    if (targetPet.primary_color && candidateFeatures.includes(targetPet.primary_color.toLowerCase())) {
      reasons.push(`Coincidencia en color (${targetPet.primary_color})`);
      attrBonus += 0.12;
    }

    if (sim > 0.4) {
      reasons.push("Alta similitud de rasgos visuales y descripción");
    }

    // Hybrid weighted score
    const rawScore = 0.50 * sim + 0.35 * geoScore + 0.15 * attrBonus;
    const finalScore = Math.min(99, Math.max(25, Math.round(rawScore * 100)));

    results.push({
      pet: candidate,
      score: finalScore,
      distanceKm,
      reasons: reasons.slice(0, 3),
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
