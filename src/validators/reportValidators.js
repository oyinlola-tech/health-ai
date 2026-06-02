import { z } from "zod";

export const reportCreateSchema = z.object({
  title: z.string().min(1).max(180).optional()
});

export const reportIdSchema = z.object({
  id: z.string().uuid()
});
