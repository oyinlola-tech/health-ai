import { z } from "zod";

export const appointmentCreateSchema = z.object({
  doctorId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  reason: z.string().min(1).max(1000),
  notes: z.string().max(2000).optional()
});

export const appointmentStatusSchema = z.object({
  status: z.enum(["requested", "confirmed", "completed", "cancelled"])
});
