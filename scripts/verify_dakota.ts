import { findBestMatches } from "../src/lib/matching-engine";
import seedPets from "../src/data/seed_pets.json";
import { PetReport } from "../src/lib/types";

const b5 = seedPets.find((p) => p.id === "B5") as PetReport;
const matchesB5 = findBestMatches(b5, seedPets as PetReport[], 5);

console.log("=== MATCHES FOR DAKOTA (B5) ===");
for (const m of matchesB5) {
  console.log(`- ${m.pet.id} (${m.pet.name}): ${m.score}% | Reasons: ${m.reasons.join(" | ")}`);
}

// Test with newly rescued Dakota (R156)
const rescuedDakota: PetReport = {
  id: "R156",
  report_type: "FOUND",
  species: "DOG",
  name: "Pastor rescatado",
  gender: "HEMBRA",
  primary_color: "Negro",
  secondary_color: "Café",
  pattern: "Abigarrado",
  size: "GRANDE",
  distinctive_features: "Pastor holandes negro atigrado en el ingenio",
  neighborhood: "El Ingenio",
  lat: 3.385,
  lng: -76.535,
  photo_url: "/photos/B5.png",
  contact_name: "Rescatista",
  status: "ACTIVE",
};

const matchesRescued = findBestMatches(rescuedDakota, seedPets as PetReport[], 5);
console.log("\n=== MATCHES FOR RESCUED DAKOTA (R156) ===");
for (const m of matchesRescued) {
  console.log(`- ${m.pet.id} (${m.pet.name}): ${m.score}% | Reasons: ${m.reasons.join(" | ")}`);
}
