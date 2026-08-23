import { PetReport } from "../types";
import { PetObservationCluster, PetReIDFeatures } from "./types";
import { calculateVectorCosine, scorePetReIDPair } from "./petface-engine";
import { calculateDistanceKm } from "../matching-engine";

/**
 * Clusters a collection of rescuer observations (FOUND / OBSERVED) into
 * unified individual pet clusters using high-confidence multimodal & PetFace similarity.
 */
export function clusterPetObservations(
  observations: Array<{ report: PetReport; features: PetReIDFeatures }>,
  similarityThreshold = 0.82,
  maxGeoDistanceKm = 4.0
): PetObservationCluster[] {
  const clusters: PetObservationCluster[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < observations.length; i++) {
    const current = observations[i];
    if (assigned.has(current.report.id || `idx_${i}`)) continue;

    // Start a new cluster
    const clusterId = `cluster_${current.report.id || i}_${Date.now()}`;
    const clusterMembers: PetReport[] = [current.report];
    assigned.add(current.report.id || `idx_${i}`);

    // Aggregate vectors for cluster centroid
    const allPetfaceVecs: number[][] = [];
    const allClipVecs: number[][] = [];
    if (current.features.petface?.vector) allPetfaceVecs.push(current.features.petface.vector);
    if (current.features.visualClip?.vector) allClipVecs.push(current.features.visualClip.vector);

    // Look for candidates to add to this cluster
    for (let j = i + 1; j < observations.length; j++) {
      const candidate = observations[j];
      const candidateKey = candidate.report.id || `idx_${j}`;
      if (assigned.has(candidateKey)) continue;

      // Species must match
      if (current.features.species !== candidate.features.species) continue;

      // Geography check: observations must be within realistic displacement distance
      const distance = calculateDistanceKm(
        current.features.lat,
        current.features.lng,
        candidate.features.lat,
        candidate.features.lng
      );
      if (distance !== null && distance > maxGeoDistanceKm) continue;

      // Pairwise match score
      const match = scorePetReIDPair(current.features, candidate.features, candidate.report);
      if (match && match.totalScore >= Math.round(similarityThreshold * 100)) {
        clusterMembers.push(candidate.report);
        assigned.add(candidateKey);

        if (candidate.features.petface?.vector) allPetfaceVecs.push(candidate.features.petface.vector);
        if (candidate.features.visualClip?.vector) allClipVecs.push(candidate.features.visualClip.vector);
      }
    }

    // Compute centroid/representative vector
    const repPetface = computeVectorCentroid(allPetfaceVecs);
    const repClip = computeVectorCentroid(allClipVecs);

    const locations = clusterMembers.map((m) => ({
      neighborhood: m.neighborhood,
      lat: m.lat,
      lng: m.lng,
      timestamp: m.created_at,
    }));

    const aggregatedFeatures = Array.from(
      new Set(
        clusterMembers
          .map((m) => m.distinctive_features)
          .filter(Boolean) as string[]
      )
    );

    clusters.push({
      clusterId,
      species: current.features.species,
      canonicalName: current.report.name || "Rescatado",
      primaryPhotoUrl: current.report.photo_url,
      sightingCount: clusterMembers.length,
      observations: clusterMembers,
      representativeEmbedding: {
        petface: repPetface,
        visualClip: repClip,
      },
      locations,
      aggregatedFeatures,
    });
  }

  return clusters;
}

function computeVectorCentroid(vectors: number[][]): number[] | undefined {
  if (vectors.length === 0) return undefined;
  const dim = vectors[0].length;
  const centroid = new Array(dim).fill(0);

  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i];
    }
  }

  // Normalize centroid to unit length
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectors.length;
    norm += centroid[i] * centroid[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      centroid[i] /= norm;
    }
  }
  return centroid;
}
