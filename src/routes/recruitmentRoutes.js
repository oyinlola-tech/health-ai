import { Router } from "express";
import { recruitmentController } from "../controllers/recruitmentController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { csrfProtection } from "../middlewares/csrf.js";
import { apiRateLimit } from "../middlewares/rateLimit.js";
import { applicationCreateSchema, applicationReviewSchema, jobCreateSchema } from "../validators/recruitmentValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const recruitmentRoutes = Router();

// Public endpoints (no authentication required)
recruitmentRoutes.get("/jobs", asyncHandler(recruitmentController.jobs));

// Authenticated endpoints (authentication required for all subsequent routes)
recruitmentRoutes.use(authenticate);

// File upload with CSRF protection and rate limiting
recruitmentRoutes.post(
  "/applications",
  csrfProtection,
  apiRateLimit,
  upload.single("cv"),
  validate(applicationCreateSchema),
  auditAction("recruitment.application.submit"),
  asyncHandler(recruitmentController.apply)
);

// Admin-only endpoints
recruitmentRoutes.use(requireRoles("Admin"));
recruitmentRoutes.post("/jobs", validate(jobCreateSchema), auditAction("recruitment.job.create"), asyncHandler(recruitmentController.createJob));
recruitmentRoutes.patch("/jobs/:id/publish", auditAction("recruitment.job.publish"), asyncHandler(recruitmentController.publishJob));
recruitmentRoutes.get("/applications", asyncHandler(recruitmentController.applications));
recruitmentRoutes.patch("/applications/:id/review", validate(applicationReviewSchema), auditAction("recruitment.application.review"), asyncHandler(recruitmentController.review));
