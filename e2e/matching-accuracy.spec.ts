import { test, expect } from "@playwright/test";
import { findBestMatches } from "../src/lib/matching-engine";
import seedPets from "../src/data/seed_pets.json";
import { PetReport } from "../src/lib/types";

test.describe("AI Matching Engine - Dynamic Scoring for New Records", () => {
  test("Calculates dynamic, high accuracy scores for newly created pets", async () => {
    // Simulated newly registered pet R156 (Dog in Nápoles)
    const petR156: PetReport = {
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

    const matches = findBestMatches(petR156, seedPets as PetReport[], 5);

    console.log("Calculated matches for R156:");
    for (const m of matches) {
      console.log(`- Candidate ${m.pet.id} (${m.pet.name}, ${m.pet.primary_color}, ${m.pet.neighborhood}): Score = ${m.score}% | Reasons = ${m.reasons.join(", ")}`);
    }

    expect(matches.length).toBeGreaterThan(0);
    // Must NOT be flat 33%
    const allScoresAre33 = matches.every((m) => m.score === 33);
    expect(allScoresAre33).toBe(false);

    // Top match should have a meaningful score (> 45%)
    expect(matches[0].score).toBeGreaterThan(45);
  });
});
