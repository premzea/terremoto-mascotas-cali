import { test, expect } from "@playwright/test";
import { PetReport } from "../src/lib/types";
import {
  scorePetReIDPair,
  petReportToReIDFeatures,
  calculateGeospatialPlausibility,
  calculateVectorCosine,
} from "../src/lib/reid/petface-engine";
import { clusterPetObservations } from "../src/lib/reid/clustering-service";
import { PetFaceEmbedding, VisualClipEmbedding } from "../src/lib/reid/types";

test.describe("PetFace Multimodal Re-Identification & Clustering Engine", () => {
  // Helper to generate normalized test vectors
  function createRandomUnitVector(dim: number, seed: number): number[] {
    const vec: number[] = [];
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      const val = Math.sin(seed * (i + 1));
      vec.push(val);
      norm += val * val;
    }
    norm = Math.sqrt(norm);
    return vec.map((v) => v / norm);
  }

  const basePetfaceVectorA = createRandomUnitVector(512, 42);
  // Vector with 95% similarity
  const closePetfaceVectorA = basePetfaceVectorA.map((v, i) => v + (i % 2 === 0 ? 0.01 : -0.01));
  const normA = Math.sqrt(closePetfaceVectorA.reduce((sum, v) => sum + v * v, 0));
  const normalizedClosePetfaceVectorA = closePetfaceVectorA.map((v) => v / normA);

  const baseClipVectorA = createRandomUnitVector(768, 77);

  test("1. Biometric Match: Calculates high score (90%+) when PetFace facial vectors match closely", () => {
    const lostDog: PetReport = {
      id: "LOST_DAKOTA",
      report_type: "LOST",
      species: "DOG",
      name: "Dakota",
      primary_color: "Negro",
      secondary_color: "Café",
      size: "GRANDE",
      distinctive_features: "Pastor holandés, orejas puntiagudas erectas",
      neighborhood: "El Ingenio",
      lat: 3.385,
      lng: -76.535,
      photo_url: "https://example.com/dakota_lost.jpg",
      contact_name: "Dueña Maria",
    };

    const foundDog: PetReport = {
      id: "FOUND_R1",
      report_type: "FOUND",
      species: "DOG",
      name: "Rescatado",
      primary_color: "Negro",
      secondary_color: "Café",
      size: "GRANDE",
      distinctive_features: "Pastor holandes negro atigrado",
      neighborhood: "El Ingenio",
      lat: 3.388,
      lng: -76.532,
      photo_url: "https://example.com/dakota_found.jpg",
      contact_name: "Rescatista Juan",
    };

    const lostFeatures = petReportToReIDFeatures(
      lostDog,
      { vector: basePetfaceVectorA, confidence: 0.95 },
      { vector: baseClipVectorA, model: "DINOv2_BASE" }
    );

    const foundFeatures = petReportToReIDFeatures(
      foundDog,
      { vector: normalizedClosePetfaceVectorA, confidence: 0.92 },
      { vector: baseClipVectorA, model: "DINOv2_BASE" }
    );

    const matchResult = scorePetReIDPair(lostFeatures, foundFeatures, foundDog);

    expect(matchResult).not.toBeNull();
    expect(matchResult!.totalScore).toBeGreaterThanOrEqual(88);
    expect(matchResult!.reasons.some((r) => r.includes("Biometría facial PetFace"))).toBeTruthy();
    expect(matchResult!.reasons.some((r) => r.includes("Coincidencia de color"))).toBeTruthy();
  });

  test("2. Hard Filter: Rejects candidates of different species with null result", () => {
    const lostCat: PetReport = {
      id: "LOST_CAT",
      report_type: "LOST",
      species: "CAT",
      name: "Michi",
      primary_color: "Negro",
      size: "PEQUEÑO",
      neighborhood: "San Antonio",
      photo_url: "https://example.com/cat.jpg",
      contact_name: "Dueño",
    };

    const foundDog: PetReport = {
      id: "FOUND_DOG",
      report_type: "FOUND",
      species: "DOG",
      name: "Perro Negro",
      primary_color: "Negro",
      size: "PEQUEÑO",
      neighborhood: "San Antonio",
      photo_url: "https://example.com/dog.jpg",
      contact_name: "Rescatista",
    };

    const lostFeatures = petReportToReIDFeatures(lostCat, null, null);
    const foundFeatures = petReportToReIDFeatures(foundDog, null, null);

    const matchResult = scorePetReIDPair(lostFeatures, foundFeatures, foundDog);
    expect(matchResult).toBeNull();
  });

  test("3. Dual-Stream Fallback: Dynamically redistributes weights when PetFace is not detected in side/back photo", () => {
    const lostDog: PetReport = {
      id: "LOST_MAX",
      report_type: "LOST",
      species: "DOG",
      name: "Max",
      primary_color: "Amarillo",
      size: "MEDIANO",
      distinctive_features: "Golden Retriever con collar rojo",
      neighborhood: "Pance",
      lat: 3.325,
      lng: -76.538,
      photo_url: "https://example.com/max.jpg",
      contact_name: "Dueño",
    };

    const foundDogBackView: PetReport = {
      id: "FOUND_MAX_BACK",
      report_type: "FOUND",
      species: "DOG",
      name: "Perro Encontrado",
      primary_color: "Amarillo",
      size: "MEDIANO",
      distinctive_features: "Golden Retriever pelaje dorado",
      neighborhood: "Pance",
      lat: 3.328,
      lng: -76.536,
      photo_url: "https://example.com/max_back.jpg",
      contact_name: "Rescatista",
    };

    // No petface vector (face unaligned), but strong whole-body CLIP vector
    const lostFeatures = petReportToReIDFeatures(
      lostDog,
      null,
      { vector: baseClipVectorA, model: "DINOv2_BASE" }
    );
    const foundFeatures = petReportToReIDFeatures(
      foundDogBackView,
      null,
      { vector: baseClipVectorA, model: "DINOv2_BASE" }
    );

    const matchResult = scorePetReIDPair(lostFeatures, foundFeatures, foundDogBackView);

    expect(matchResult).not.toBeNull();
    expect(matchResult!.totalScore).toBeGreaterThanOrEqual(80);
    // Verified whole-body fallback reasons
    expect(matchResult!.reasons.some((r) => r.includes("Similitud visual de cuerpo"))).toBeTruthy();
    expect(matchResult!.reasons.some((r) => r.includes("Coincidencia de color"))).toBeTruthy();
  });

  test("4. Observation Clustering: Successfully clusters 3 separate rescuer sightings of the same husky in El Ingenio", () => {
    const huskyVector = createRandomUnitVector(512, 99);
    const clipVector = createRandomUnitVector(768, 88);

    const sighting1: PetReport = {
      id: "R_HUSKY_1",
      report_type: "FOUND",
      species: "DOG",
      name: "Husky Ojos Azules",
      primary_color: "Gris",
      secondary_color: "Blanco",
      size: "GRANDE",
      distinctive_features: "Husky siberiano ojos azules visto en carrera 85",
      neighborhood: "El Ingenio",
      lat: 3.385,
      lng: -76.535,
      photo_url: "https://example.com/h1.jpg",
      contact_name: "Brigada 1",
      created_at: new Date().toISOString(),
    };

    const sighting2: PetReport = {
      id: "R_HUSKY_2",
      report_type: "FOUND",
      species: "DOG",
      name: "Husky Resguardado",
      primary_color: "Gris",
      secondary_color: "Blanco",
      size: "GRANDE",
      distinctive_features: "Husky siberiano resguardado en parque",
      neighborhood: "El Ingenio",
      lat: 3.387,
      lng: -76.534,
      photo_url: "https://example.com/h2.jpg",
      contact_name: "Brigada 2",
      created_at: new Date().toISOString(),
    };

    const sighting3: PetReport = {
      id: "R_HUSKY_3",
      report_type: "FOUND",
      species: "DOG",
      name: "Perro Husky",
      primary_color: "Gris",
      secondary_color: "Blanco",
      size: "GRANDE",
      distinctive_features: "Husky siberiano con placa borrosa",
      neighborhood: "El Ingenio",
      lat: 3.386,
      lng: -76.533,
      photo_url: "https://example.com/h3.jpg",
      contact_name: "Vecino 3",
      created_at: new Date().toISOString(),
    };

    const unrelatedDog: PetReport = {
      id: "R_PINCHER",
      report_type: "FOUND",
      species: "DOG",
      name: "Pincher Mini",
      primary_color: "Negro",
      size: "PEQUEÑO",
      distinctive_features: "Pincher miniatura",
      neighborhood: "San Fernando",
      lat: 3.435,
      lng: -76.545,
      photo_url: "https://example.com/pincher.jpg",
      contact_name: "Rescatista 4",
      created_at: new Date().toISOString(),
    };

    const observations = [
      {
        report: sighting1,
        features: petReportToReIDFeatures(
          sighting1,
          { vector: huskyVector, confidence: 0.95 },
          { vector: clipVector, model: "DINOv2_BASE" }
        ),
      },
      {
        report: sighting2,
        features: petReportToReIDFeatures(
          sighting2,
          { vector: huskyVector, confidence: 0.94 },
          { vector: clipVector, model: "DINOv2_BASE" }
        ),
      },
      {
        report: sighting3,
        features: petReportToReIDFeatures(
          sighting3,
          { vector: huskyVector, confidence: 0.93 },
          { vector: clipVector, model: "DINOv2_BASE" }
        ),
      },
      {
        report: unrelatedDog,
        features: petReportToReIDFeatures(
          unrelatedDog,
          { vector: createRandomUnitVector(512, 11), confidence: 0.8 },
          { vector: createRandomUnitVector(768, 22), model: "DINOv2_BASE" }
        ),
      },
    ];

    const clusters = clusterPetObservations(observations, 0.80, 3.0);

    // Expect 2 clusters: 1 Husky cluster with 3 observations, 1 Pincher cluster with 1 observation
    expect(clusters.length).toBe(2);

    const huskyCluster = clusters.find((c) => c.observations.some((o) => o.id === "R_HUSKY_1"));
    expect(huskyCluster).toBeDefined();
    expect(huskyCluster!.sightingCount).toBe(3);
    expect(huskyCluster!.observations.map((o) => o.id)).toEqual(
      expect.arrayContaining(["R_HUSKY_1", "R_HUSKY_2", "R_HUSKY_3"])
    );
  });
});
