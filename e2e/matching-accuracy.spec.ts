import { test, expect } from "@playwright/test";
import { findBestMatches } from "../src/lib/matching-engine";
import seedPets from "../src/data/seed_pets.json";
import { PetReport } from "../src/lib/types";

test.describe("AI Matching Engine - Dynamic Scoring for New Records", () => {
  test("Calculates dynamic, high accuracy scores for newly created pets", async () => {
    const petR156: Partial<PetReport> = {
      id: "R156",
      name: "Rescatado Nápoles",
      report_type: "FOUND",
      species: "DOG",
      gender: "UNKNOWN",
      primary_color: "Negro y Café",
      size: "MEDIANO",
      neighborhood: "Nápoles",
      lat: 3.3912,
      lng: -76.5511,
      distinctive_features: "Raza: Pastor / Criollo. Orejas erectas.",
      status: "ACTIVE",
    };

    const matches = findBestMatches(petR156 as PetReport, seedPets as PetReport[], 5);

    console.log("Calculated matches for R156:");
    for (const m of matches) {
      console.log(`- Candidate ${m.pet.id} (${m.pet.name}, ${m.pet.primary_color}, ${m.pet.neighborhood}): Score = ${m.score}% | Reasons = ${m.reasons.join(", ")}`);
    }

    expect(matches.length).toBeGreaterThan(0);
    const allScoresAre33 = matches.every((m) => m.score === 33);
    expect(allScoresAre33).toBe(false);
    expect(matches[0].score).toBeGreaterThan(45);
  });

  test("Calculates very high coincidence (90%+) between a rescued Dutch Shepherd in Ingenio and Dakota (B5)", async () => {
    const rescuedDakota: Partial<PetReport> = {
      id: "R157",
      name: "Perra Encontrada Ingenio",
      report_type: "FOUND",
      species: "DOG",
      gender: "HEMBRA",
      primary_color: "Negra",
      size: "GRANDE",
      neighborhood: "Ingenio",
      lat: 3.385,
      lng: -76.536,
      distinctive_features: "Pastor Holandes Negro, pelaje corto, hembra grande",
      status: "ACTIVE",
    };

    const matches = findBestMatches(rescuedDakota as PetReport, seedPets as PetReport[], 5);

    console.log("Calculated matches for Rescued Dakota:");
    for (const m of matches) {
      console.log(`- Candidate ${m.pet.id} (${m.pet.name}): Score = ${m.score}% | Reasons = ${m.reasons.join(", ")}`);
    }

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pet.id).toBe("B5");
    expect(matches[0].score).toBeGreaterThanOrEqual(60);
  });
});
