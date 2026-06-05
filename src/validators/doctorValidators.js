import { z } from "zod";

export const doctorSearchSchema = z.object({
  q: z.string().max(120).optional(),
  specialization: z.string().max(120).optional(),
  availableOnly: z.enum(["true", "false"]).optional(),
  minRating: z.coerce.number().min(0).max(5).optional()
});

export const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.coerce.number().int().min(10).max(240).optional().default(30)
});

export const unavailableSlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(500).optional()
});

export const doctorProfileUpdateSchema = z.object({
  specialization: z.string().min(1).max(120).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  bio: z.string().max(1000).optional(),
  consultationFeeCents: z.coerce.number().int().min(0).optional(),
  acceptingPatients: z.boolean().optional(),
  vacationMode: z.boolean().optional()
});

export const doctorVerificationSchema = z.object({
  status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "SUSPENDED"]),
  notes: z.string().max(1000).optional()
});

export const consultationMessageSchema = z.object({
  content: z.string().min(1).max(5000)
});
