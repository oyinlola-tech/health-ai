import { Router } from "express";
import { reportController } from "../controllers/reportController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { upload, validateUploadedFile } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import { aiEndpointRateLimit, uploadRateLimit } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reportCreateSchema, reportIdSchema } from "../validators/reportValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const reportRoutes = Router();

reportRoutes.use(authenticate);
reportRoutes.get("/", asyncHandler(reportController.list));
reportRoutes.post(
  "/",
  requireRoles("Patient"),
  uploadRateLimit,
  upload.single("report"),
  validateUploadedFile,
  validate(reportCreateSchema),
  auditAction("report.create"),
  asyncHandler(reportController.create)
);
reportRoutes.get("/:id", validate(reportIdSchema, "params"), asyncHandler(reportController.detail));
reportRoutes.post("/:id/analyze", aiEndpointRateLimit, validate(reportIdSchema, "params"), auditAction("report.analyze"), asyncHandler(reportController.analyze));
reportRoutes.delete("/:id", validate(reportIdSchema, "params"), auditAction("report.delete"), asyncHandler(reportController.remove));
