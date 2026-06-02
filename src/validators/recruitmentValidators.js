import { z } from "zod";

export const jobCreateSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(5000),
  specialty: z.string().max(180).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft")
});

export const applicationCreateSchema = z.object({
  jobId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(50).optional()
});

export const applicationReviewSchema = z.object({
  status: z.enum(["accepted", "rejected"])
});
