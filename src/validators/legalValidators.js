import { z } from "zod";

export const consentSchema = z.object({
  policySlug: z.string().min(1).max(120),
  policyVersion: z.string().min(1).max(40),
  accepted: z.boolean()
});

export const operationalConsentSchema = z.object({
  consentType: z.enum(["medical_data_processing", "AI_analysis", "doctor_sharing", "payment_processing"]),
  granted: z.boolean()
});
