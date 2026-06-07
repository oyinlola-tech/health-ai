import { Router } from "express";
import { medicalKnowledgeController } from "../controllers/medicalKnowledgeController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const medicalKnowledgeRoutes = Router();

medicalKnowledgeRoutes.get("/", asyncHandler(medicalKnowledgeController.overview));
