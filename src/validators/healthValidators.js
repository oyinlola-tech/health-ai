import { z } from "zod";

export const healthEntryCreateSchema = z.object({
  category: z.string().min(1).max(120),
  title: z.string().min(1).max(180),
  value: z.string().max(500).optional(),
  recordedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional().default({})
});
