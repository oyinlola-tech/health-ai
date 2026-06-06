import { z } from "zod";

export const checkoutSchema = z.object({
  planCode: z.enum(["BASIC_MONTHLY", "PREMIUM_MONTHLY"]),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MED-[A-Z0-9]{6,12}$/)
    .optional()
});

export const paymentReferenceSchema = z.object({
  reference: z.string().min(8).max(120)
});

export const refundSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(5).max(500)
});
