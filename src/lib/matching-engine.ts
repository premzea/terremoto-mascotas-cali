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

// Morphological Breed & Body Structure Families
export function getBreedMorphology(breedText?: string | null): string {
  if (!breedText) return "UNKNOWN";
  const b = breedText.toLowerCase();
  
  if (
    b.includes("pastor") ||
    b.includes("malinois") ||
    b.includes("belga") ||
    b.includes("holandes") ||
    b.includes("aleman") ||
    b.includes("husky") ||
    b.includes("siberiano") ||
    b.includes("akita") ||
    b.includes("lobo")
  ) {
    return "SHEPHERD_LARGE"; // Hocico largo, porte atlético/grande, orejas erectas
  }

  if (
    b.includes("bulldog") ||
    b.includes("french") ||
    b.includes("frances") ||
    b.includes("pug") ||
    b.includes("boston") ||
    b.includes("braquicefalo")
  ) {
    return "BULLDOG_BRACHY"; // Cráneo plano/corto, tamaño compacto
  }

  if (
    b.includes("pitbull") ||
    b.includes("bull terrier") ||
    b.includes("american bully") ||
    b.includes("staffordshire") ||
    b.includes("rottweiler") ||
    b.includes("boxer") ||
    b.includes("dogo")
  ) {
    return "TERRIER_MOLOSSER"; // Musculoso, mandíbula ancha
  }

  if (
    b.includes("pincher") ||
    b.includes("chihuahua") ||
    b.includes("pomerania") ||
    b.includes("shih") ||
    b.includes("yorkie") ||
    b.includes("yorkshire") ||
    b.includes("maltes")
  ) {
    return "TOY_TINY"; // Raza mini/toy
  }

  if (
    b.includes("labrador") ||
    b.includes("golden") ||
    b.includes("retriever") ||
    b.includes("beagle") ||
    b.includes("pointer") ||
    b.includes("sabueso") ||
    b.includes("weimaraner")
  ) {
    return "RETRIEVER_HOUND"; // Sabueso / Cobrador
  }

  if (
    b.includes("cocker") ||
    b.includes("spaniel") ||
    b.includes("poodle") ||
    b.includes("caniche") ||
    b.includes("schnauzer") ||
    b.includes("bobtail")
  ) {
    return "MEDIUM_FLUFFY"; // Pelo rizado / semi-largo
  }

  if (b.includes("salchicha") || b.includes("dachshund") || b.includes("teckel")) {
    return "DACHSHUND"; // Cuerpo alargado, patas cortas
  }

  return "GENERAL_CRIOLLO";
}

// Extract dominant color keywords
function getDominantColors(text?: string | null): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found: string[] = [];
  const colorMap = ["negro", "blanco", "cafe", "marron", "marrón", "amarillo", "miel", "naranja", "gris", "dorado", "canela", "atigrado"];
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
  const targetColors = getDominantColors(`${targetVisual.primary_color || ""} ${targetPet.primary_color || ""} ${targetVisual.distinctive_marks || ""}`);
  const targetMorphology = getBreedMorphology(`${targetVisual.breed_likely || ""} ${targetPet.primary_color || ""} ${targetPet.distinctive_features || ""}`);

  const searchInTypes =
    targetPet.report_type === "LOST"
      ? ["FOUND", "SHELTERED", "OBSERVED"]
      : ["LOST"];

  const results: MatchResult[] = [];

  for (const candidate of allPets) {
    // 1. HARD RULE-OUT FILTERS

    // No auto-cotejar con el mismo reporte
    if (candidate.id === targetPet.id) continue;

    // Filtro estricto de Especie (Perro con Perro, Gato con Gato)
    if (candidate.species !== targetPet.species) continue;

    // Filtro de Flujo (Perdido busca Encontrado, y viceversa)
    if (!searchInTypes.includes(candidate.report_type)) continue;

    // FILTRO ESTRICTO DE SEXO (Descartar incompatibilidad biológica)
    if (
      targetPet.gender &&
      candidate.gender &&
      targetPet.gender !== "UNKNOWN" &&
      candidate.gender !== "UNKNOWN" &&
      targetPet.gender !== candidate.gender
    ) {
      continue; // DESCARTADO POR SEXO OPUESTO
    }

    const candidateVisual: VisualTrait = vCache[candidate.id || ""] || {};
    const candidateVector = cache[candidate.id || ""] || [];
    const candidateColors = getDominantColors(`${candidateVisual.primary_color || ""} ${candidate.primary_color || ""} ${candidateVisual.distinctive_marks || ""}`);
    const candidateMorphology = getBreedMorphology(`${candidateVisual.breed_likely || ""} ${candidate.primary_color || ""} ${candidate.distinctive_features || ""}`);

    // FILTRO ESTRICTO DE INCOMPATIBILIDAD MORFOLÓGICA / RAZA:
    if (
      (targetMorphology === "SHEPHERD_LARGE" && (candidateMorphology === "BULLDOG_BRACHY" || candidateMorphology === "TOY_TINY" || candidateMorphology === "DACHSHUND")) ||
      (targetMorphology === "BULLDOG_BRACHY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND" || candidateMorphology === "DACHSHUND")) ||
      (targetMorphology === "TOY_TINY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "TERRIER_MOLOSSER" || candidateMorphology === "RETRIEVER_HOUND")) ||
      (targetMorphology === "DACHSHUND" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND"))
    ) {
      continue; // DESCARTADO POR INCOMPATIBILIDAD ANATÓMICA/RAZA
    }

    // FILTRO ESTRICTO DE COLOR EXCLUYENTE:
    // Si un animal es negro/oscuro sólido y el candidato es blanco/claro sólido sin rastros oscuros, descartar.
    const isTargetDark = targetColors.some((c) => ["negro", "marron", "cafe", "atigrado"].includes(c));
    const isCandidateDark = candidateColors.some((c) => ["negro", "marron", "cafe", "atigrado"].includes(c));
    const isTargetWhite = targetColors.includes("blanco") && !isTargetDark;
    const isCandidateWhite = candidateColors.includes("blanco") && !isCandidateDark;

    if (isTargetDark && isCandidateWhite) {
      continue; // DESCARTADO: Animal oscuro no coincide con animal blanco puro
    }
    if (isTargetWhite && isCandidateDark) {
      continue; // DESCARTADO: Animal blanco puro no coincide con animal oscuro
    }

    // 2. Color Compatibility Bonus
    let colorBonus = 0;
    const hasColorOverlap = targetColors.some((tc) => candidateColors.includes(tc));
    if (hasColorOverlap) {
      colorBonus += 0.35;
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

    // Sexo compatible / coincidente
    if (targetPet.gender && candidate.gender && targetPet.gender === candidate.gender && targetPet.gender !== "UNKNOWN") {
      reasons.push(`⚧ Sexo coincidente (${targetPet.gender === "MACHO" ? "Macho" : "Hembra"})`);
    }

    // Raza y Morfología
    if (targetMorphology !== "GENERAL_CRIOLLO" && targetMorphology === candidateMorphology) {
      reasons.push(`🐾 Misma tipología (${candidateVisual.breed_likely || "Estructura compatible"})`);
      colorBonus += 0.30;
    } else if (candidateVisual.breed_likely) {
      reasons.push(`🐾 Raza: ${candidateVisual.breed_likely}`);
    }

    // Color match
    if (targetColors.length > 0 && candidateColors.length > 0 && targetColors.some((tc) => candidateColors.includes(tc))) {
      reasons.push(`🎨 Color compatible (${candidateVisual.primary_color || candidateColors.join(", ")})`);
    }

    // Ear structure match
    if (targetVisual.ear_type && candidateVisual.ear_type && targetVisual.ear_type === candidateVisual.ear_type) {
      reasons.push(`👂 Orejas coincidentes (${targetVisual.ear_type.toLowerCase()})`);
      colorBonus += 0.15;
    }

    // Distance explanation
    if (distanceKm <= 3.0) {
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 7.0) {
      reasons.push(`📍 A ${distanceKm} km en ${candidate.neighborhood}`);
    }

    // 6. Compute Multi-Factor Final Score
    const rawScore = 0.45 * sim + 0.25 * geoScore + 0.30 * colorBonus;
    const finalScore = Math.min(99, Math.max(25, Math.round(rawScore * 100)));

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
