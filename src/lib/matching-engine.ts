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
  dominantKey: string;
} {
  if (!text) return { isOrange: false, isGray: false, isBlack: false, isBrown: false, isWhite: false, dominantKey: "OTHER" };
  const lower = text.toLowerCase();
  
  const isOrange = /naranja|amarillo|miel|rubio|ginger|dorado|garfield/i.test(lower);
  const isGray = /gris|plomo|plateado|cenizo|azul ruso/i.test(lower);
  const isBlack = /negro|azabache|oscuro/i.test(lower);
  const isBrown = /marron|marrón|cafe|café|chocolate|canela/i.test(lower);
  const isWhite = /blanco|crema/i.test(lower);

  let dominantKey = "OTHER";
  if (isOrange && !isGray && !isBlack) dominantKey = "ORANGE";
  else if (isGray && !isOrange) dominantKey = "GRAY";
  else if (isBlack && !isOrange) dominantKey = "BLACK";
  else if (isBrown && !isOrange && !isGray) dominantKey = "BROWN";
  else if (isWhite && !isBlack && !isGray && !isOrange && !isBrown) dominantKey = "WHITE_SOLID";

  return { isOrange, isGray, isBlack, isBrown, isWhite, dominantKey };
}

export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5
): MatchResult[] {
  const vCache = (visualFeaturesCache as unknown) as Record<string, VisualTrait>;

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

    // RULE OUT: SEX INCOMPATIBILITY
    if (
      targetPet.gender &&
      candidate.gender &&
      targetPet.gender !== "UNKNOWN" &&
      candidate.gender !== "UNKNOWN" &&
      targetPet.gender !== candidate.gender
    ) {
      continue; // Descartado por sexo opuesto
    }

    const candidateVisual: VisualTrait = vCache[candidate.id || ""] || {};
    const candidateText = `${candidateVisual.primary_color || ""} ${candidateVisual.secondary_color || ""} ${candidate.primary_color || ""} ${candidateVisual.distinctive_marks || ""}`;
    const candidateChroma = getChromas(candidateText);
    const candidateMorphology = getBreedMorphology(`${candidateVisual.breed_likely || ""} ${candidate.primary_color || ""} ${candidate.distinctive_features || ""}`);

    // RULE OUT: MORPHOLOGY / BREED INCOMPATIBILITY (Canines)
    if (targetPet.species === "DOG") {
      if (
        (targetMorphology === "SHEPHERD_LARGE" && (candidateMorphology === "BULLDOG_BRACHY" || candidateMorphology === "TOY_TINY" || candidateMorphology === "DACHSHUND")) ||
        (targetMorphology === "BULLDOG_BRACHY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND" || candidateMorphology === "DACHSHUND")) ||
        (targetMorphology === "TOY_TINY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "TERRIER_MOLOSSER" || candidateMorphology === "RETRIEVER_HOUND")) ||
        (targetMorphology === "DACHSHUND" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND"))
      ) {
        continue; // Descartado por estructura corporal incompatible
      }
    }

    // RULE OUT: CHROMATIC SPECTRUM INCOMPATIBILITY
    // Un animal Gris (como Angel) NUNCA puede ser Naranja (como R131)
    if (targetChroma.isGray && !targetChroma.isOrange && candidateChroma.isOrange && !candidateChroma.isGray) {
      continue;
    }
    if (targetChroma.isOrange && !targetChroma.isGray && candidateChroma.isGray && !candidateChroma.isOrange) {
      continue;
    }
    // Un animal Negro sólido nunca es Naranja puro o Blanco puro
    if (targetChroma.isBlack && !targetChroma.isOrange && candidateChroma.isOrange && !candidateChroma.isBlack) {
      continue;
    }
    if (targetChroma.isBlack && !targetChroma.isWhite && candidateChroma.isWhite && !candidateChroma.isBlack) {
      continue;
    }
    if (targetChroma.isWhite && !targetChroma.isBlack && candidateChroma.isBlack && !candidateChroma.isWhite) {
      continue;
    }

    // 2. RIGOROUS MULTI-TRAIT SCORE CALCULATION (0 - 100)
    let score = 0;
    const reasons: string[] = [];

    // Factor A: Primary & Secondary Color Matching (Max 35 pts)
    const tPrimary = (targetVisual.primary_color || targetPet.primary_color || "").toLowerCase();
    const cPrimary = (candidateVisual.primary_color || candidate.primary_color || "").toLowerCase();
    
    if (
      (targetChroma.isGray && candidateChroma.isGray) ||
      (targetChroma.isOrange && candidateChroma.isOrange) ||
      (targetChroma.isBlack && candidateChroma.isBlack) ||
      (targetChroma.isBrown && candidateChroma.isBrown)
    ) {
      score += 28;
      reasons.push(`🎨 Mismo color principal (${candidateVisual.primary_color || "Coincidente"})`);
      // Extra bonus for matching secondary/white pattern
      if (targetChroma.isWhite && candidateChroma.isWhite) {
        score += 7;
      }
    } else if (targetChroma.isWhite && candidateChroma.isWhite) {
      score += 20;
      reasons.push("🎨 Tono blanco compatible");
    }

    // Factor B: Breed & Morphology (Max 22 pts)
    const tBreed = (targetVisual.breed_likely || "").toLowerCase();
    const cBreed = (candidateVisual.breed_likely || "").toLowerCase();
    if (tBreed && cBreed) {
      if (tBreed === cBreed && !tBreed.includes("mestizo") && !tBreed.includes("criollo")) {
        score += 22;
        reasons.push(`🐾 Misma raza exacta (${candidateVisual.breed_likely})`);
      } else if (targetMorphology !== "GENERAL_CRIOLLO" && targetMorphology === candidateMorphology) {
        score += 16;
        reasons.push(`🐾 Misma tipología (${candidateVisual.breed_likely || "Estructura compatible"})`);
      } else if (tBreed.includes("mestizo") && cBreed.includes("mestizo")) {
        score += 5;
      }
    }

    // Factor C: Ear Structure (Max 12 pts)
    if (targetVisual.ear_type && candidateVisual.ear_type && targetVisual.ear_type === candidateVisual.ear_type) {
      score += 12;
      reasons.push(`👂 Orejas coincidentes (${targetVisual.ear_type.toLowerCase()})`);
    }

    // Factor D: Coat Pattern (Max 10 pts)
    if (targetVisual.coat_pattern && candidateVisual.coat_pattern && targetVisual.coat_pattern === candidateVisual.coat_pattern) {
      score += 10;
      reasons.push(`✨ Patrón de pelaje (${targetVisual.coat_pattern.toLowerCase()})`);
    }

    // Factor E: Fur Length (Max 6 pts)
    if (targetVisual.fur_length && candidateVisual.fur_length && targetVisual.fur_length === candidateVisual.fur_length) {
      score += 6;
    }

    // Factor F: Verified Sex Match (Max 5 pts)
    if (targetPet.gender && candidate.gender && targetPet.gender === candidate.gender && targetPet.gender !== "UNKNOWN") {
      score += 5;
      reasons.push(`⚧ Sexo coincidente (${targetPet.gender === "MACHO" ? "Macho" : "Hembra"})`);
    }

    // Factor G: Geographic Distance in Cali (Max 10 pts)
    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );

    if (distanceKm <= 2.0) {
      score += 10;
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 5.0) {
      score += 6;
      reasons.push(`📍 A ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 9.0) {
      score += 3;
      reasons.push(`📍 A ${distanceKm} km en ${candidate.neighborhood}`);
    }

    // Uncapped realistic score (0 - 100)
    const finalScore = Math.min(99, Math.max(5, score));

    // Only include if score is at least 30% (filter out arbitrary noise)
    if (finalScore >= 25) {
      results.push({
        pet: candidate,
        score: finalScore,
        distanceKm,
        reasons: reasons.slice(0, 3),
        visualSummary: candidateVisual.search_summary,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
