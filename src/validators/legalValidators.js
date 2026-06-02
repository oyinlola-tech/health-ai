import { z } from "zod";

export const consentSchema = z.object({
  policySlug: z.string().min(1).max(120),
  policyVersion: z.string().min(1).max(40),
  accepted: z.boolean()
});
