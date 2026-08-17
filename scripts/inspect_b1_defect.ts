import { findBestMatches } from "../src/lib/matching-engine";
import seedPets from "../src/data/seed_pets.json";
import { PetReport } from "../src/lib/types";

const allPets = seedPets as PetReport[];
const b1 = allPets.find(p => p.id === "B1") as PetReport;

const simulatedRescueB1: PetReport = {
  ...b1,
  id: "RESCUE_B1",
  report_type: "FOUND",
  name: "Rescatado Miel",
  status: "ACTIVE",
};

const matches = findBestMatches(simulatedRescueB1, allPets, 10, "V1_CLASSIC", 0);

console.log("=== MATCHES FOR RESCUED B1 (Miel) ===");
for (let i = 0; i < matches.length; i++) {
  const m = matches[i];
  console.log(`#${i + 1}: ${m.pet.id} (${m.pet.name}) | Score: ${m.score}% | Dist: ${m.distanceKm}km | Reasons: ${m.reasons.join(" | ")}`);
}
