import { z } from "zod";

export const jobCreateSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(5000),
  specialty: z.string().max(180).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft")
});

export const applicationCreateSchema = z.object({
  jobId: z.string().uuid().optional(),
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(50).optional(),
  medicalLicenseNumber: z.string().min(1).max(120),
  specialization: z.string().min(1).max(120),
  yearsExperience: z.coerce.number().int().min(0).max(80)
});

export const applicationReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(1000).optional()
});

export const applicationStatusSchema = z.object({
  email: z.string().email(),
  medicalLicenseNumber: z.string().min(1).max(120)
});
