import { Router } from "express";
import { recruitmentController } from "../controllers/recruitmentController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { upload, validateUploadedFiles } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiRateLimit, uploadRateLimit } from "../middlewares/rateLimit.js";
import { applicationCreateSchema, applicationReviewSchema, applicationStatusSchema, jobCreateSchema } from "../validators/recruitmentValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const recruitmentRoutes = Router();

// Public endpoints (no authentication required)
recruitmentRoutes.get("/jobs", asyncHandler(recruitmentController.jobs));
recruitmentRoutes.post("/applications/status", apiRateLimit, validate(applicationStatusSchema), asyncHandler(recruitmentController.status));
recruitmentRoutes.post(
  "/applications",
  apiRateLimit,
  uploadRateLimit,
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "license", maxCount: 1 }
  ]),
  validateUploadedFiles,
  validate(applicationCreateSchema),
  auditAction("recruitment.application.submit"),
  asyncHandler(recruitmentController.apply)
);

// Admin-only endpoints
recruitmentRoutes.use(authenticate);
recruitmentRoutes.use(requireRoles("Admin"));
recruitmentRoutes.post("/jobs", validate(jobCreateSchema), auditAction("recruitment.job.create"), asyncHandler(recruitmentController.createJob));
recruitmentRoutes.patch("/jobs/:id/publish", auditAction("recruitment.job.publish"), asyncHandler(recruitmentController.publishJob));
recruitmentRoutes.get("/applications", asyncHandler(recruitmentController.applications));
recruitmentRoutes.patch("/applications/:id/review", validate(applicationReviewSchema), auditAction("recruitment.application.review"), asyncHandler(recruitmentController.review));
