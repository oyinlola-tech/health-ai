import { Router } from "express";
import { legalController } from "../controllers/legalController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { consentSchema } from "../validators/legalValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const legalRoutes = Router();

// Public endpoints (no authentication required)
legalRoutes.get("/policies", asyncHandler(legalController.policies));

// Authenticated endpoints
legalRoutes.use(authenticate);
legalRoutes.post("/consents", validate(consentSchema), auditAction("legal.consent.record"), asyncHandler(legalController.consent));
