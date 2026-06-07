import { Router } from "express";
import { systemController } from "../controllers/systemController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const systemRoutes = Router();

systemRoutes.use(authenticate, requireRoles("Admin"));
systemRoutes.post("/test-gemini", asyncHandler(systemController.testGemini));
