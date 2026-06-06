import { z } from "zod";

export const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MED-[A-Z0-9]{6,12}$/)
    .optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().int().positive(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional()
});

export const validateCouponSchema = z.object({
  planCode: z.enum(["BASIC_MONTHLY", "PREMIUM_MONTHLY"]),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MED-[A-Z0-9]{6,12}$/)
});
