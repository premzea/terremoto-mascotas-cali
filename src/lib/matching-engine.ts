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

// Discrete Color Signature Classifier (STRICTLY ON FUR COLOR ONLY)
export type ColorSignature =
  | "ORANGE_WHITE"
  | "ORANGE_SOLID"
  | "GRAY_WHITE"
  | "GRAY_SOLID"
  | "BLACK_WHITE"
  | "BLACK_SOLID"
  | "BROWN_WHITE"
  | "BROWN_SOLID"
  | "WHITE_SOLID"
  | "TRICOLOR_CAREY"
  | "MULTICOLOR";

export function getPureFurSignature(visual?: VisualTrait, pet?: PetReport): ColorSignature {
  const prim = (visual?.primary_color || "").toLowerCase();
  const sec = (visual?.secondary_color || "").toLowerCase();
  let petPrim = (pet?.primary_color || "").toLowerCase();
  if (petPrim === "desconocido") petPrim = "";

  // STRICTLY inspect fur color fields only (exclude eyes/collar from distinctive_marks)
  const furTxt = `${prim} ${sec} ${petPrim}`.toLowerCase();
  
  const isOrange = /naranja|amarillo|miel|rubio|ginger|dorado|canela|garfield/i.test(furTxt);
  const isGray = /gris|plomo|plateado|cenizo|azul ruso/i.test(furTxt);
  const isBlack = /negro|azabache|oscuro/i.test(furTxt);
  const isBrown = /marron|marrón|cafe|café|chocolate/i.test(furTxt);
  const isWhite = /blanco|crema/i.test(furTxt);

  if ((isOrange && isBlack && isWhite) || /carey|calico|tricolor/i.test(furTxt)) return "TRICOLOR_CAREY";
  if (isOrange && isWhite) return "ORANGE_WHITE";
  if (isOrange) return "ORANGE_SOLID";
  if (isGray && isWhite) return "GRAY_WHITE";
  if (isGray) return "GRAY_SOLID";
  if (isBlack && isWhite) return "BLACK_WHITE";
  if (isBlack) return "BLACK_SOLID";
  if (isBrown && isWhite) return "BROWN_WHITE";
  if (isBrown) return "BROWN_SOLID";
  if (isWhite) return "WHITE_SOLID";

  return "MULTICOLOR";
}

// Morphological Breed & Body Structure Families (Canines)
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

export function findBestMatches(
  targetPet: PetReport,
  allPets: PetReport[],
  limit = 5
): MatchResult[] {
  const vCache = (visualFeaturesCache as unknown) as Record<string, VisualTrait>;

  const targetVisual: VisualTrait = vCache[targetPet.id || ""] || {};
  const targetSignature = getPureFurSignature(targetVisual, targetPet);
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
      continue; // Descartado por sexo biológico opuesto
    }

    const candidateVisual: VisualTrait = vCache[candidate.id || ""] || {};
    const candidateSignature = getPureFurSignature(candidateVisual, candidate);
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

    // RULE OUT: STRICT DISCRETE FUR COLOR SIGNATURE (Felines & Canines)
    let signatureScore = 0;
    const reasons: string[] = [];

    if (targetSignature === candidateSignature) {
      signatureScore = 55; // Puntuación base alta por coincidencia cromática exacta
      reasons.push(`🎨 Color pelaje idéntico (${candidateVisual.primary_color || candidateSignature})`);
    } else {
      // Compatibilidades secundarias permitidas
      if (targetSignature === "GRAY_WHITE" && candidateSignature === "GRAY_SOLID") {
        signatureScore = 35;
        reasons.push("🎨 Tono gris compatible");
      } else if (targetSignature === "GRAY_SOLID" && candidateSignature === "GRAY_WHITE") {
        signatureScore = 35;
        reasons.push("🎨 Tono gris compatible");
      } else if (targetSignature === "ORANGE_WHITE" && candidateSignature === "ORANGE_SOLID") {
        signatureScore = 35;
        reasons.push("🎨 Tono naranja/amarillo compatible");
      } else if (targetSignature === "ORANGE_SOLID" && candidateSignature === "ORANGE_WHITE") {
        signatureScore = 35;
        reasons.push("🎨 Tono naranja/amarillo compatible");
      } else if (targetSignature === "BLACK_WHITE" && candidateSignature === "BLACK_SOLID") {
        signatureScore = 35;
        reasons.push("🎨 Tono negro compatible");
      } else if (targetSignature === "BLACK_SOLID" && candidateSignature === "BLACK_WHITE") {
        signatureScore = 35;
        reasons.push("🎨 Tono negro compatible");
      } else if (targetSignature === "TRICOLOR_CAREY" || candidateSignature === "TRICOLOR_CAREY") {
        signatureScore = 25;
        reasons.push("🎨 Patrón tricolor/carey compatible");
      } else {
        // CROMATIC CLASH -> EXCLUDE COMPLETELY! (Un gato naranja nunca es gris ni negro)
        continue;
      }
    }

    // 2. PATTERN & BREED MORPHOLOGY SCORING
    let traitScore = 0;

    // Pattern (Rayas/Atigrado vs Bicolor vs Sólido)
    if (targetVisual.coat_pattern && candidateVisual.coat_pattern && targetVisual.coat_pattern === candidateVisual.coat_pattern) {
      traitScore += 18;
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

      // Ear type in dogs
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
    const finalScore = Math.min(99, Math.max(25, signatureScore + traitScore + geoScore));

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
