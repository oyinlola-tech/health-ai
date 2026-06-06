import { Router } from "express";
import { appointmentController } from "../controllers/appointmentController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { abuseBanGuard, bookingRateLimit } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { appointmentCreateSchema, appointmentStatusSchema } from "../validators/appointmentValidators.js";
import { auditAction } from "../middlewares/audit.js";
import { entitlementGuard } from "../modules/payments/entitlement.guard.js";

export const appointmentRoutes = Router();

appointmentRoutes.use(authenticate);
appointmentRoutes.get("/", asyncHandler(appointmentController.list));
appointmentRoutes.post(
  "/",
  abuseBanGuard("booking"),
  bookingRateLimit,
  entitlementGuard.requireDoctorConsultation,
  validate(appointmentCreateSchema),
  auditAction("appointment.create"),
  asyncHandler(appointmentController.create)
);
appointmentRoutes.patch("/:id/status", validate(appointmentStatusSchema), auditAction("appointment.status.update"), asyncHandler(appointmentController.updateStatus));
