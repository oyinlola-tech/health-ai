import { z } from "zod";

const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: z.string().email(),
  password,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  consentPromptLearning: z.boolean().optional().default(false)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email()
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32),
  password
});

export const emailVerifySchema = z.object({
  token: z.string().min(20)
});

export const createDoctorSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  specialty: z.string().min(1).max(120),
  licenseNumber: z.string().min(1).max(120).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "SUSPENDED"]).optional(),
  bio: z.string().max(1000).optional()
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  consentPromptLearning: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().default({})
});
