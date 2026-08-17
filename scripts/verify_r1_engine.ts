import { findBestMatches } from "../src/lib/matching-engine";
import seedPets from "../src/data/seed_pets.json";
import { PetReport } from "../src/lib/types";

const r1 = seedPets.find((p) => p.id === "R1") as PetReport;
const matches = findBestMatches(r1, seedPets as PetReport[], 10);

console.log("=== MATCHES FOR R1 (Mostly White Dog with Black Spots) ===");
for (const m of matches) {
  console.log(`- ${m.pet.id} (${m.pet.name}): ${m.score}% | Colors: ${m.pet.primary_color} | Reasons: ${m.reasons.join(" | ")}`);
}

const shuryMatch = matches.find((m) => m.pet.id === "B8");
console.log("\nShury (B8) in Top Matches?:", shuryMatch ? `${shuryMatch.score}%` : "Not in Top 10");
