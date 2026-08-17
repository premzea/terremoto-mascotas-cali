const seedPets = require("../src/data/seed_pets.json");
const v2Cache = require("../src/data/visual_features_v2_cache.json");
const dinoCache = require("../src/data/dinov2_embeddings.json");

// Helper to determine dominant and accent colors
function extractColorProfile(pet, v2) {
  let colors = [];
  if (v2 && v2.coat_colors && v2.coat_colors.length > 0) {
    colors = [...v2.coat_colors];
  } else {
    const text = `${pet.primary_color || ""} ${pet.secondary_color || ""} ${pet.distinctive_features || ""}`.toLowerCase();
    if (/blanco|white/.test(text)) colors.push("WHITE");
    if (/negro|black/.test(text)) colors.push("BLACK");
    if (/cafe|marron|brown/.test(text)) colors.push("BROWN");
    if (/amarillo|dorado|golden|yellow/.test(text)) colors.push("GOLDEN_YELLOW");
    if (/gris|plomo|gray/.test(text)) colors.push("GRAY_SILVER");
  }
  return {
    dominant: colors[0] || "UNKNOWN",
    secondary: colors[1] || null,
    all: colors,
  };
}

function calculateColorScore(profA, profB) {
  // If neither has colors, neutral
  if (profA.all.length === 0 || profB.all.length === 0) return { score: 15, reason: "Color no especificado" };

  // Case 1: Same dominant base color (e.g. Both are primarily White or both Black)
  if (profA.dominant === profB.dominant && profA.dominant !== "UNKNOWN") {
    let pts = 25; // Base dominant match
    if (profA.secondary && profB.secondary && profA.secondary === profB.secondary) {
      pts += 10; // Exact secondary accent match
      return { score: pts, reason: `🎨 Pelaje base y acento coincidentes (${profA.dominant} + ${profA.secondary})` };
    }
    return { score: pts, reason: `🎨 Mismo color base dominante (${profA.dominant})` };
  }

  // Case 2: Inverted Dominance (One is White dominant with Black spots, other is Black dominant with White chest)
  if (profA.dominant === profB.secondary && profA.secondary === profB.dominant) {
    return { score: 6, reason: `⚠️ Colores invertidos (Base ${profA.dominant} vs Base ${profB.dominant})` };
  }

  // Case 3: Dominant matches secondary only (e.g. White dog vs Brown dog with white chest)
  if (profA.dominant === profB.secondary || profB.dominant === profA.secondary) {
    return { score: 10, reason: `🎨 Coincidencia parcial de acento` };
  }

  // Case 4: Complete color mismatch (e.g. White dog vs Brown dog)
  return { score: 0, reason: `❌ Colores incompatibles` };
}

const r1 = seedPets.find((p) => p.id === "R1");
const r1V2 = v2Cache["R1"];
const r1Prof = extractColorProfile(r1, r1V2);
console.log("R1 Color Profile:", r1Prof);

const lostDogs = seedPets.filter((p) => p.report_type === "LOST" && p.species === "DOG");

console.log("\n--- NEW COLOR SCORING FOR R1 ---");
const scores = [];
for (const dog of lostDogs) {
  const dogV2 = v2Cache[dog.id] || {};
  const dogProf = extractColorProfile(dog, dogV2);
  const colorRes = calculateColorScore(r1Prof, dogProf);
  scores.push({
    id: dog.id,
    name: dog.name,
    dogProf,
    colorScore: colorRes.score,
    reason: colorRes.reason,
  });
}

scores.sort((a, b) => b.colorScore - a.colorScore);
console.log("Top 10 highest color matches for R1 (Mostly White with Black spots):");
scores.slice(0, 10).forEach(s => {
  console.log(`- ${s.id} (${s.name}): ${s.colorScore} pts | ${s.reason} | Base: ${s.dogProf.dominant}, Accent: ${s.dogProf.secondary}`);
});

console.log("\nShury (B8) score for R1:");
const shuryScore = scores.find(s => s.id === "B8");
console.log(`- Shury: ${shuryScore.colorScore} pts | ${shuryScore.reason}`);
