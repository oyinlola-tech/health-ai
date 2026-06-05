import { z } from "zod";

export const checkoutSchema = z.object({
  planCode: z.enum(["PREMIUM_MONTHLY", "PREMIUM_ANNUAL"])
});

export const paymentReferenceSchema = z.object({
  reference: z.string().min(8).max(120)
});

export const refundSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(5).max(500)
});
