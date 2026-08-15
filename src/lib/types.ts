import { z } from "zod";

export const PetReportSchema = z.object({
  id: z.string().optional(),
  report_type: z.enum(["LOST", "FOUND", "SHELTERED", "OBSERVED"]),
  species: z.enum(["DOG", "CAT", "OTHER"]),
  name: z.string().min(1).max(100).default("Sin nombre"),
  gender: z.enum(["MACHO", "HEMBRA", "UNKNOWN"]).default("UNKNOWN"),
  primary_color: z.string().min(1).max(50),
  secondary_color: z.string().max(50).optional().default(""),
  pattern: z.string().max(50).optional().default(""),
  size: z.enum(["PEQUEÑO", "MEDIANO", "GRANDE"]).default("MEDIANO"),
  distinctive_features: z.string().max(500).optional().default(""),
  neighborhood: z.string().min(1).max(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photo_url: z.string().min(1),
  contact_name: z.string().min(1).max(100),
  contact_phone: z.string().min(7).max(20).optional(),
  source_url: z.string().optional(),
  status: z.enum(["ACTIVE", "REUNITED", "CLOSED"]).default("ACTIVE"),
  created_at: z.string().optional(),
});

export type PetReport = z.infer<typeof PetReportSchema>;

export interface OfflineQueueItem {
  id: string;
  data: PetReport;
  photoBlob?: Blob;
  timestamp: number;
  status: "PENDING" | "SYNCING" | "FAILED";
}
