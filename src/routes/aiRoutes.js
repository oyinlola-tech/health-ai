import { Router } from "express";
import { aiController } from "../controllers/aiController.js";
import { aiUsageController } from "../controllers/aiUsageController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chatSchema, feedbackSchema } from "../validators/aiValidators.js";

export const aiRoutes = Router();

aiRoutes.use(authenticate);
aiRoutes.get("/usage/me", asyncHandler(aiUsageController.me));
aiRoutes.get("/usage/summary", requireRoles("Admin"), asyncHandler(aiUsageController.summary));
aiRoutes.get("/usage/user/:id", requireRoles("Admin"), asyncHandler(aiUsageController.user));
aiRoutes.get("/usage/costs", requireRoles("Admin"), asyncHandler(aiUsageController.costs));
aiRoutes.get("/usage/dashboard", requireRoles("Admin"), asyncHandler(aiUsageController.dashboard));
aiRoutes.post("/chat", validate(chatSchema), asyncHandler(aiController.chat));
aiRoutes.get("/chat-history", asyncHandler(aiController.history));
aiRoutes.post("/feedback", validate(feedbackSchema), asyncHandler(aiController.feedback));
