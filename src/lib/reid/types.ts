import { PetReport } from "../types";
import { PetMetadataV2 } from "../matching-engine";

export interface PetBoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface PetFaceEmbedding {
  vector: number[]; // 512-dimensional normalized vector
  confidence: number; // 0.0 to 1.0
  box?: PetBoundingBox;
  landmarks?: {
    left_eye?: [number, number];
    right_eye?: [number, number];
    nose?: [number, number];
  };
}

export interface VisualClipEmbedding {
  vector: number[]; // 768-dimensional normalized vector (DINOv2 / OpenCLIP)
  model: "DINOv2_BASE" | "OPENCLIP_VIT_B32" | "SIGLIP";
}

export interface CanonicalPetAttributes {
  species: "DOG" | "CAT" | "OTHER";
  size: "PEQUEÑO" | "MEDIANO" | "GRANDE";
  coat_colors: string[];
  coat_pattern?: string;
  breed?: string;
  ear_type?: "ERECT" | "FLOPPY" | "SEMI_ERECT" | "UNKNOWN";
  tail_type?: "LONG" | "SHORT_DOCKED" | "CURLY" | "UNKNOWN";
  eye_color?: string;
  distinctive_markings: string[];
  collar_present?: boolean;
  collar_color?: string;
}

export interface PetReIDFeatures {
  petId: string;
  reportType: "LOST" | "FOUND" | "SHELTERED" | "OBSERVED";
  species: "DOG" | "CAT" | "OTHER";
  faceDetected: boolean;
  petface?: PetFaceEmbedding | null;
  visualClip?: VisualClipEmbedding | null;
  canonicalAttributes: CanonicalPetAttributes;
  lat?: number;
  lng?: number;
  neighborhood?: string;
  timestamp?: string | number;
  clusterId?: string;
}

export interface ReIDScoringWeights {
  petfaceWeight: number; // e.g. 0.35
  clipVisualWeight: number; // e.g. 0.25
  attributeWeight: number; // e.g. 0.20
  geospatialWeight: number; // e.g. 0.15
  temporalWeight: number; // e.g. 0.05
}

export const DEFAULT_REID_WEIGHTS: ReIDScoringWeights = {
  petfaceWeight: 0.35,
  clipVisualWeight: 0.25,
  attributeWeight: 0.20,
  geospatialWeight: 0.15,
  temporalWeight: 0.05,
};

export interface MultimodalMatchScoreResult {
  candidatePet: PetReport;
  totalScore: number; // 0 to 100
  subScores: {
    petfaceSim?: number; // 0 to 1
    clipSim?: number; // 0 to 1
    attributeSim: number; // 0 to 1
    geoPlausibility: number; // 0 to 1
    temporalPlausibility: number; // 0 to 1
  };
  distanceKm: number;
  reasons: string[];
  isClusterMatch?: boolean;
  clusterMembersCount?: number;
}

export interface PetObservationCluster {
  clusterId: string;
  species: "DOG" | "CAT" | "OTHER";
  canonicalName: string;
  primaryPhotoUrl: string;
  sightingCount: number;
  observations: PetReport[];
  representativeEmbedding: {
    petface?: number[];
    visualClip?: number[];
  };
  locations: Array<{
    neighborhood: string;
    lat?: number;
    lng?: number;
    timestamp?: string;
  }>;
  aggregatedFeatures: string[];
}
