import { findBestMatches } from "../src/lib/matching-engine";
import seedPets from "../src/data/seed_pets.json";
import dinov2Embeddings from "../src/data/dinov2_embeddings.json";
import visualFeaturesV2 from "../src/data/visual_features_v2_cache.json";
import { PetReport } from "../src/lib/types";

interface SelfIdResult {
  petId: string;
  name: string;
  species: string;
  rank: number;
  score: number;
  runnerUpScore: number;
  scoreGap: number;
  isTop1: boolean;
  isTop3: boolean;
  notes: string;
}

interface BenchmarkSummary {
  modeName: string;
  totalEvaluated: number;
  top1Accuracy: number;
  top3Accuracy: number;
  mrr: number;
  averageSelfScore: number;
  averageScoreGap: number;
  failedIdentifications: { id: string; name: string; rank: number; score: number }[];
}

function runSelfIdentificationBenchmark(
  algorithmMode: "V1_CLASSIC" | "V2_MULTIMODAL"
): BenchmarkSummary {
  const allPets = seedPets as PetReport[];
  const lostPets = allPets.filter((p) => p.report_type === "LOST");
  const dinoCache = dinov2Embeddings as Record<string, number[]>;
  const v2Cache = visualFeaturesV2 as Record<string, any>;

  const results: SelfIdResult[] = [];
  let sumRankReciprocal = 0;
  let sumSelfScore = 0;
  let sumScoreGap = 0;
  let top1Count = 0;
  let top3Count = 0;

  for (const target of lostPets) {
    // We simulate a rescued sighting of the same pet (different ID so it isn't skipped by self-exclusion)
    const simulatedRescue: PetReport = {
      ...target,
      id: `SIM_${target.id}`,
      report_type: "FOUND",
      name: `Rescatado (${target.name || "Sin nombre"})`,
      status: "ACTIVE",
    };

    const simId = simulatedRescue.id || `SIM_${target.id}`;

    // We make sure the simulated rescue inherits the visual cache of the photo
    if (target.id && dinoCache[target.id]) {
      dinoCache[simId] = dinoCache[target.id];
    }
    if (target.id && v2Cache[target.id]) {
      v2Cache[simId] = v2Cache[target.id];
    }

    // We query against the database of lost pets
    const matches = findBestMatches(simulatedRescue, allPets, 50, algorithmMode, 0);

    const targetIndex = matches.findIndex((m) => m.pet.id === target.id);
    const rank = targetIndex !== -1 ? targetIndex + 1 : 999;
    const score = targetIndex !== -1 ? matches[targetIndex].score : 0;
    const runnerUpScore = matches.length > 1 ? (targetIndex === 0 ? matches[1].score : matches[0].score) : 0;
    const scoreGap = score - runnerUpScore;

    if (rank === 1) top1Count++;
    if (rank <= 3) top3Count++;

    sumRankReciprocal += 1 / rank;
    sumSelfScore += score;
    sumScoreGap += scoreGap;

    results.push({
      petId: target.id || "N/A",
      name: target.name || "Sin nombre",
      species: target.species,
      rank,
      score,
      runnerUpScore,
      scoreGap,
      isTop1: rank === 1,
      isTop3: rank <= 3,
      notes: rank !== 1 ? `Ranked #${rank} (Score: ${score}% vs Winner: ${runnerUpScore}%)` : "OK",
    });
  }

  const count = lostPets.length;
  const failed = results
    .filter((r) => !r.isTop1)
    .map((r) => ({ id: r.petId, name: r.name, rank: r.rank, score: r.score }));

  return {
    modeName: algorithmMode,
    totalEvaluated: count,
    top1Accuracy: Math.round((top1Count / count) * 1000) / 10,
    top3Accuracy: Math.round((top3Count / count) * 1000) / 10,
    mrr: Math.round((sumRankReciprocal / count) * 1000) / 1000,
    averageSelfScore: Math.round((sumSelfScore / count) * 10) / 10,
    averageScoreGap: Math.round((sumScoreGap / count) * 10) / 10,
    failedIdentifications: failed,
  };
}

console.log("==================================================================================");
console.log("🐾 TEST DE AUTO-IDENTIFICACIÓN Y CONSISTENCIA BIOMÉTRICA (97 CASOS PERDIDOS)");
console.log("==================================================================================\n");

const resV1 = runSelfIdentificationBenchmark("V1_CLASSIC");
const resV2 = runSelfIdentificationBenchmark("V2_MULTIMODAL");

console.log("📊 RESULTADOS COMPARATIVOS GLOBALES:\n");
console.table({
  "V1 Clásico (Linear Multi-Factor + Polarity)": {
    "Total Mascotas Evaluadas": resV1.totalEvaluated,
    "Top-1 Accuracy (Auto-Identificación Exacta)": `${resV1.top1Accuracy}%`,
    "Top-3 Recall (Dentro de las 3 primeras)": `${resV1.top3Accuracy}%`,
    "MRR (Mean Reciprocal Rank)": resV1.mrr,
    "Puntaje Promedio de Auto-Coincidencia": `${resV1.averageSelfScore}%`,
    "Margen de Separación frente al Impostor #2": `+${resV1.averageScoreGap}%`,
    "Casos Fallidos (Rank > #1)": resV1.failedIdentifications.length,
  },
  "V2 Re-ID Multimodal (Dynamic Dual-Stream + Decay)": {
    "Total Mascotas Evaluadas": resV2.totalEvaluated,
    "Top-1 Accuracy (Auto-Identificación Exacta)": `${resV2.top1Accuracy}%`,
    "Top-3 Recall (Dentro de las 3 primeras)": `${resV2.top3Accuracy}%`,
    "MRR (Mean Reciprocal Rank)": resV2.mrr,
    "Puntaje Promedio de Auto-Coincidencia": `${resV2.averageSelfScore}%`,
    "Margen de Separación frente al Impostor #2": `+${resV2.averageScoreGap}%`,
    "Casos Fallidos (Rank > #1)": resV2.failedIdentifications.length,
  },
});

if (resV1.failedIdentifications.length > 0) {
  console.log("\n⚠️ Casos fallidos en V1 Clásico:", resV1.failedIdentifications);
}

if (resV2.failedIdentifications.length > 0) {
  console.log("\n⚠️ Casos fallidos en V2 Re-ID:", resV2.failedIdentifications);
}

console.log("\n==================================================================================");
