import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  reportId: z.string().uuid().optional()
});

export const feedbackSchema = z.object({
  interactionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});
