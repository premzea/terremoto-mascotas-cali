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
    return "SHEPHERD_LARGE";
  }

  if (
    b.includes("bulldog") ||
    b.includes("french") ||
    b.includes("frances") ||
    b.includes("pug") ||
    b.includes("boston") ||
    b.includes("braquicefalo")
  ) {
    return "BULLDOG_BRACHY";
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
    return "TERRIER_MOLOSSER";
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
    return "TOY_TINY";
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
    return "RETRIEVER_HOUND";
  }

  if (
    b.includes("cocker") ||
    b.includes("spaniel") ||
    b.includes("poodle") ||
    b.includes("caniche") ||
    b.includes("schnauzer") ||
    b.includes("bobtail")
  ) {
    return "MEDIUM_FLUFFY";
  }

  if (b.includes("salchicha") || b.includes("dachshund") || b.includes("teckel")) {
    return "DACHSHUND";
  }

  return "GENERAL_CRIOLLO";
}

// Categorize primary chromas
function getChromas(text?: string | null): {
  isOrange: boolean;
  isGray: boolean;
  isBlack: boolean;
  isBrown: boolean;
  isWhite: boolean;
  rawList: string[];
} {
  if (!text) return { isOrange: false, isGray: false, isBlack: false, isBrown: false, isWhite: false, rawList: [] };
  const lower = text.toLowerCase();
  
  const isOrange = /naranja|amarillo|miel|rubio|ginger|dorado|garfield/i.test(lower);
  const isGray = /gris|plomo|plateado|cenizo|azul ruso/i.test(lower);
  const isBlack = /negro|azabache|oscuro/i.test(lower);
  const isBrown = /marron|marrón|cafe|café|chocolate|canela/i.test(lower);
  const isWhite = /blanco|crema/i.test(lower);

  const rawList: string[] = [];
  if (isOrange) rawList.push("Naranja/Amarillo");
  if (isGray) rawList.push("Gris");
  if (isBlack) rawList.push("Negro");
  if (isBrown) rawList.push("Marrón");
  if (isWhite) rawList.push("Blanco");

  return { isOrange, isGray, isBlack, isBrown, isWhite, rawList };
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
  const targetText = `${targetVisual.primary_color || ""} ${targetVisual.secondary_color || ""} ${targetPet.primary_color || ""} ${targetVisual.distinctive_marks || ""}`;
  const targetChroma = getChromas(targetText);
  const targetMorphology = getBreedMorphology(`${targetVisual.breed_likely || ""} ${targetPet.primary_color || ""} ${targetPet.distinctive_features || ""}`);

  const searchInTypes =
    targetPet.report_type === "LOST"
      ? ["FOUND", "SHELTERED", "OBSERVED"]
      : ["LOST"];

  const results: MatchResult[] = [];

  for (const candidate of allPets) {
    // 1. HARD RULE-OUT FILTERS

    if (candidate.id === targetPet.id) continue;
    if (candidate.species !== targetPet.species) continue;
    if (!searchInTypes.includes(candidate.report_type)) continue;

    // FILTRO ESTRICTO DE SEXO
    if (
      targetPet.gender &&
      candidate.gender &&
      targetPet.gender !== "UNKNOWN" &&
      candidate.gender !== "UNKNOWN" &&
      targetPet.gender !== candidate.gender
    ) {
      continue; // DESCARTADO POR SEXO
    }

    const candidateVisual: VisualTrait = vCache[candidate.id || ""] || {};
    const candidateVector = cache[candidate.id || ""] || [];
    const candidateText = `${candidateVisual.primary_color || ""} ${candidateVisual.secondary_color || ""} ${candidate.primary_color || ""} ${candidateVisual.distinctive_marks || ""}`;
    const candidateChroma = getChromas(candidateText);
    const candidateMorphology = getBreedMorphology(`${candidateVisual.breed_likely || ""} ${candidate.primary_color || ""} ${candidate.distinctive_features || ""}`);

    // FILTRO ESTRICTO DE INCOMPATIBILIDAD MORFOLÓGICA / RAZA (Caninos)
    if (targetPet.species === "DOG") {
      if (
        (targetMorphology === "SHEPHERD_LARGE" && (candidateMorphology === "BULLDOG_BRACHY" || candidateMorphology === "TOY_TINY" || candidateMorphology === "DACHSHUND")) ||
        (targetMorphology === "BULLDOG_BRACHY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND" || candidateMorphology === "DACHSHUND")) ||
        (targetMorphology === "TOY_TINY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "TERRIER_MOLOSSER" || candidateMorphology === "RETRIEVER_HOUND")) ||
        (targetMorphology === "DACHSHUND" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND"))
      ) {
        continue; // DESCARTADO POR ANATOMÍA
      }
    }

    // FILTRO ESTRICTO DE INCOMPATIBILIDAD CROMÁTICA PRIMARIA (Tanto Gatos como Perros):
    // 1. Un animal Gris (como Angel) NO PUEDE ser Naranja (como R131)
    if (targetChroma.isGray && !targetChroma.isOrange && candidateChroma.isOrange && !candidateChroma.isGray) {
      continue; // DESCARTADO: Gris no coincide con Naranja
    }
    if (targetChroma.isOrange && !targetChroma.isGray && candidateChroma.isGray && !candidateChroma.isOrange) {
      continue; // DESCARTADO: Naranja no coincide con Gris
    }

    // 2. Un animal Negro sólido no coincide con Naranja puro o Blanco puro
    if (targetChroma.isBlack && !targetChroma.isOrange && candidateChroma.isOrange && !candidateChroma.isBlack) {
      continue; // DESCARTADO: Negro no coincide con Naranja
    }
    if (targetChroma.isBlack && !targetChroma.isWhite && candidateChroma.isWhite && !candidateChroma.isBlack) {
      continue; // DESCARTADO: Negro puro no coincide con Blanco puro
    }
    if (targetChroma.isWhite && !targetChroma.isBlack && candidateChroma.isBlack && !candidateChroma.isWhite) {
      continue; // DESCARTADO: Blanco puro no coincide con Negro puro
    }

    // 2. Color Compatibility & Alignment Bonus
    let colorBonus = 0;
    const reasons: string[] = [];

    // Chequeo de compatibilidad cromática específica
    if (targetChroma.isGray && candidateChroma.isGray) {
      colorBonus += 0.40;
      reasons.push("🎨 Pelaje Gris / Plomo coincidente");
    } else if (targetChroma.isOrange && candidateChroma.isOrange) {
      colorBonus += 0.40;
      reasons.push("🎨 Pelaje Naranja / Rubio coincidente");
    } else if (targetChroma.isBlack && candidateChroma.isBlack) {
      colorBonus += 0.40;
      reasons.push("🎨 Pelaje Negro / Oscuro coincidente");
    } else if (targetChroma.isBrown && candidateChroma.isBrown) {
      colorBonus += 0.40;
      reasons.push("🎨 Pelaje Marrón / Café coincidente");
    } else if (targetChroma.isWhite && candidateChroma.isWhite) {
      colorBonus += 0.20;
      reasons.push("🎨 Manchas o pelaje blanco compatible");
    }

    // Sexo coincidente
    if (targetPet.gender && candidate.gender && targetPet.gender === candidate.gender && targetPet.gender !== "UNKNOWN") {
      reasons.push(`⚧ Sexo coincidente (${targetPet.gender === "MACHO" ? "Macho" : "Hembra"})`);
    }

    // Patrón de pelaje (Bicolor, Manchas, Rayas)
    if (targetVisual.coat_pattern && candidateVisual.coat_pattern && targetVisual.coat_pattern === candidateVisual.coat_pattern) {
      reasons.push(`✨ Patrón coincidente (${targetVisual.coat_pattern.toLowerCase()})`);
      colorBonus += 0.15;
    }

    // Raza / Morfología
    if (targetMorphology !== "GENERAL_CRIOLLO" && targetMorphology === candidateMorphology) {
      reasons.push(`🐾 Misma tipología (${candidateVisual.breed_likely || "Estructura compatible"})`);
      colorBonus += 0.20;
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

    if (distanceKm <= 3.0) {
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 7.0) {
      reasons.push(`📍 A ${distanceKm} km en ${candidate.neighborhood}`);
    }

    // 5. Final Weighted Score
    const rawScore = 0.40 * sim + 0.25 * geoScore + 0.35 * colorBonus;
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
