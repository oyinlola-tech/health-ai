import { Router } from "express";
import { healthController } from "../controllers/healthController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { healthEntryCreateSchema } from "../validators/healthValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const healthHistoryRoutes = Router();

healthHistoryRoutes.use(authenticate, requireRoles("Patient"));
healthHistoryRoutes.get("/", asyncHandler(healthController.list));
healthHistoryRoutes.post("/", validate(healthEntryCreateSchema), auditAction("health_history.create"), asyncHandler(healthController.create));
