import { Router } from "express";
import { aiController } from "../controllers/aiController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chatSchema, feedbackSchema } from "../validators/aiValidators.js";

export const aiRoutes = Router();

aiRoutes.use(authenticate);
aiRoutes.post("/chat", validate(chatSchema), asyncHandler(aiController.chat));
aiRoutes.get("/chat-history", asyncHandler(aiController.history));
aiRoutes.post("/feedback", validate(feedbackSchema), asyncHandler(aiController.feedback));
