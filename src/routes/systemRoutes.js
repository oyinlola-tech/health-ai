import { Router } from "express";
import { systemController } from "../controllers/systemController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const systemRoutes = Router();

systemRoutes.use(authenticate, requireRoles("Admin"));
systemRoutes.post("/test-gemini", asyncHandler(systemController.testGemini));
systemRoutes.get("/test-chat-model", asyncHandler(systemController.testChatModel));
systemRoutes.get("/test-report-model", asyncHandler(systemController.testReportModel));
systemRoutes.get("/test-live-model", asyncHandler(systemController.testLiveModel));
systemRoutes.get("/test-embedding-model", asyncHandler(systemController.testEmbeddingModel));
systemRoutes.get("/test-rag", asyncHandler(systemController.testRag));
systemRoutes.get("/test-cache", asyncHandler(systemController.testCache));
