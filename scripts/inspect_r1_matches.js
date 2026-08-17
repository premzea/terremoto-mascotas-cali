const seedPets = require("../src/data/seed_pets.json");
const v2Cache = require("../src/data/visual_features_v2_cache.json");
const dinoCache = require("../src/data/dinov2_embeddings.json");

const r1 = seedPets.find((p) => p.id === "R1");
console.log("R1 in seed:", r1);
console.log("R1 in v2Cache:", v2Cache["R1"]);

// Look for LOST dogs
const lostDogs = seedPets.filter((p) => p.report_type === "LOST" && p.species === "DOG");

console.log("\nTop white/piebald lost dogs:");
for (const dog of lostDogs) {
  const v2 = v2Cache[dog.id] || {};
  const isWhite = (v2.coat_colors || []).includes("WHITE") || (dog.primary_color || "").toLowerCase().includes("blanco");
  if (isWhite) {
    console.log(`- ${dog.id}: ${dog.name} | Colors: ${JSON.stringify(v2.coat_colors)} | Pattern: ${v2.coat_pattern} | Seed Color: ${dog.primary_color}`);
  }
}
