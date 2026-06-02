import { Router } from "express";
import { appointmentController } from "../controllers/appointmentController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { appointmentCreateSchema, appointmentStatusSchema } from "../validators/appointmentValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const appointmentRoutes = Router();

appointmentRoutes.use(authenticate);
appointmentRoutes.get("/", asyncHandler(appointmentController.list));
appointmentRoutes.post("/", validate(appointmentCreateSchema), auditAction("appointment.create"), asyncHandler(appointmentController.create));
appointmentRoutes.patch("/:id/status", validate(appointmentStatusSchema), auditAction("appointment.status.update"), asyncHandler(appointmentController.updateStatus));
