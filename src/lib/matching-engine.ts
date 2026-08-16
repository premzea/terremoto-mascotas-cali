import { PetReport } from "./types";
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

export type ChromaFamily = "ORANGE" | "GRAY" | "BLACK" | "BROWN" | "WHITE" | "TRICOLOR" | "OTHER";

export function getDominantChroma(visual?: VisualTrait, pet?: PetReport): { primary: ChromaFamily; hasWhite: boolean; rawName: string } {
  const pColor = (visual?.primary_color || "").toLowerCase();
  const sColor = (visual?.secondary_color || "").toLowerCase();
  const petColor = (pet?.primary_color || "").toLowerCase();

  // Combine only primary fur fields
  const furText = `${pColor} ${sColor} ${petColor === "desconocido" ? "" : petColor}`;

  const isOrange = /naranja|amarillo|miel|rubio|ginger|dorado|canela|garfield/i.test(pColor) || (/naranja|amarillo|miel|rubio|ginger|dorado/i.test(petColor) && !/gris|negro/i.test(pColor));
  const isGray = /gris|plomo|plateado|cenizo|azul ruso/i.test(pColor) || (/gris/i.test(petColor) && !/naranja|negro/i.test(pColor));
  const isBlack = /negro|azabache|oscuro/i.test(pColor) || (/negro/i.test(petColor) && !/naranja|gris/i.test(pColor));
  const isBrown = /marron|marrón|cafe|café|chocolate/i.test(pColor);
  const isWhite = /blanco|crema/i.test(pColor) && !isBlack && !isGray && !isOrange && !isBrown;
  const isTricolor = /carey|calico|tricolor/i.test(furText) || (isOrange && isBlack);

  const hasWhite = /blanco|crema/i.test(furText);

  let primary: ChromaFamily = "OTHER";
  let rawName = visual?.primary_color || pet?.primary_color || "Color mixto";

  if (isTricolor) {
    primary = "TRICOLOR";
    rawName = "Tricolor / Carey";
  } else if (isOrange) {
    primary = "ORANGE";
    rawName = "Naranja / Amarillo / Miel";
  } else if (isGray) {
    primary = "GRAY";
    rawName = "Gris / Plomo";
  } else if (isBlack) {
    primary = "BLACK";
    rawName = "Negro / Oscuro";
  } else if (isBrown) {
    primary = "BROWN";
    rawName = "Marrón / Café";
  } else if (isWhite) {
    primary = "WHITE";
    rawName = "Blanco";
  }

  return { primary, hasWhite, rawName };
}

// Morphological Breed Families (Canines)
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
    b.includes("sabueso")
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

export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5
): MatchResult[] {
  const vCache = (visualFeaturesCache as unknown) as Record<string, VisualTrait>;

  const targetVisual: VisualTrait = vCache[targetPet.id || ""] || {};
  const targetChroma = getDominantChroma(targetVisual, targetPet);
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
    const candidateChroma = getDominantChroma(candidateVisual, candidate);
    const candidateMorphology = getBreedMorphology(`${candidateVisual.breed_likely || ""} ${candidate.primary_color || ""} ${candidate.distinctive_features || ""}`);

    // RULE OUT: CANINE MORPHOLOGY INCOMPATIBILITY
    if (targetPet.species === "DOG") {
      if (
        (targetMorphology === "SHEPHERD_LARGE" && (candidateMorphology === "BULLDOG_BRACHY" || candidateMorphology === "TOY_TINY" || candidateMorphology === "DACHSHUND")) ||
        (targetMorphology === "BULLDOG_BRACHY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND" || candidateMorphology === "DACHSHUND")) ||
        (targetMorphology === "TOY_TINY" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "TERRIER_MOLOSSER" || candidateMorphology === "RETRIEVER_HOUND")) ||
        (targetMorphology === "DACHSHUND" && (candidateMorphology === "SHEPHERD_LARGE" || candidateMorphology === "RETRIEVER_HOUND"))
      ) {
        continue;
      }
    }

    // RULE OUT: STRICT COLOR SPECTRUM COMPATIBILITY
    let colorScore = 0;
    const reasons: string[] = [];

    // Check if primary chromas match
    if (targetChroma.primary === candidateChroma.primary) {
      colorScore = 55;
      reasons.push(`🎨 Mismo color primario (${candidateChroma.rawName})`);

      // Bicolor match bonus (e.g. both have white chest/markings)
      if (targetChroma.hasWhite && candidateChroma.hasWhite) {
        colorScore += 10;
      }
    } else {
      // Compatible cross-categories (e.g. White Solid with Gray/White Bicolor)
      if (targetChroma.primary === "WHITE" && (candidateChroma.primary === "GRAY" || candidateChroma.primary === "BLACK") && candidateChroma.hasWhite) {
        colorScore = 35;
        reasons.push("🎨 Base blanca compatible");
      } else if (candidateChroma.primary === "WHITE" && (targetChroma.primary === "GRAY" || targetChroma.primary === "BLACK") && targetChroma.hasWhite) {
        colorScore = 35;
        reasons.push("🎨 Base blanca compatible");
      } else if (targetChroma.primary === "TRICOLOR" || candidateChroma.primary === "TRICOLOR") {
        colorScore = 30;
        reasons.push("🎨 Patrón tricolor/carey compatible");
      } else {
        // CROMATIC CLASH -> RULE OUT! (Un gato naranja NUNCA coincide con un gato gris o negro)
        continue;
      }
    }

    // 2. PATTERN & BREED MORPHOLOGY SCORING
    let traitScore = 0;

    // Pattern (Bicolor vs Rayas/Atigrado vs Sólido)
    if (targetVisual.coat_pattern && candidateVisual.coat_pattern && targetVisual.coat_pattern === candidateVisual.coat_pattern) {
      traitScore += 15;
      reasons.push(`✨ Patrón coincidente (${targetVisual.coat_pattern.toLowerCase()})`);
    }

    // Breed Morphology (Dogs)
    if (targetPet.species === "DOG") {
      const tBreed = (targetVisual.breed_likely || "").toLowerCase();
      const cBreed = (candidateVisual.breed_likely || "").toLowerCase();
      if (tBreed && cBreed && tBreed === cBreed && !tBreed.includes("mestizo")) {
        traitScore += 20;
        reasons.push(`🐾 Misma raza (${candidateVisual.breed_likely})`);
      } else if (targetMorphology !== "GENERAL_CRIOLLO" && targetMorphology === candidateMorphology) {
        traitScore += 14;
        reasons.push(`🐾 Misma tipología (${candidateVisual.breed_likely || "Estructura compatible"})`);
      }

      if (targetVisual.ear_type && candidateVisual.ear_type && targetVisual.ear_type === candidateVisual.ear_type) {
        traitScore += 8;
        reasons.push(`👂 Orejas ${targetVisual.ear_type.toLowerCase()}`);
      }
    }

    // Verified Sex Match
    if (targetPet.gender && candidate.gender && targetPet.gender === candidate.gender && targetPet.gender !== "UNKNOWN") {
      traitScore += 5;
      reasons.push(`⚧ Sexo (${targetPet.gender === "MACHO" ? "Macho" : "Hembra"})`);
    }

    // Geographic Proximity in Cali (Max 15 pts)
    const distanceKm = calculateDistanceKm(
      targetPet.lat,
      targetPet.lng,
      candidate.lat,
      candidate.lng
    );

    const geoScore = Math.max(0, Math.round(15 * (1 - distanceKm / 15)));
    if (distanceKm <= 3.0) {
      reasons.push(`📍 A solo ${distanceKm} km en ${candidate.neighborhood}`);
    } else if (distanceKm <= 7.0) {
      reasons.push(`📍 A ${distanceKm} km en ${candidate.neighborhood}`);
    }

    // Total Additive Score
    const finalScore = Math.min(99, Math.max(25, colorScore + traitScore + geoScore));

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
