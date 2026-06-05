import { Router } from "express";
import { doctorMarketplaceController } from "../controllers/doctorMarketplaceController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  availabilitySchema,
  consultationMessageSchema,
  doctorProfileUpdateSchema,
  doctorSearchSchema,
  doctorVerificationSchema,
  unavailableSlotSchema
} from "../validators/doctorValidators.js";
import { reportIdSchema } from "../validators/reportValidators.js";

export const doctorMarketplaceRoutes = Router();

doctorMarketplaceRoutes.get("/doctors", validate(doctorSearchSchema, "query"), asyncHandler(doctorMarketplaceController.directory));
doctorMarketplaceRoutes.get("/doctors/:id", validate(reportIdSchema, "params"), asyncHandler(doctorMarketplaceController.profile));

doctorMarketplaceRoutes.use(authenticate);
doctorMarketplaceRoutes.put("/doctor/profile", requireRoles("Doctor"), validate(doctorProfileUpdateSchema), asyncHandler(doctorMarketplaceController.updateProfile));
doctorMarketplaceRoutes.post("/doctor/availability", requireRoles("Doctor"), validate(availabilitySchema), asyncHandler(doctorMarketplaceController.availability));
doctorMarketplaceRoutes.post("/doctor/unavailable-slots", requireRoles("Doctor"), validate(unavailableSlotSchema), asyncHandler(doctorMarketplaceController.unavailable));
doctorMarketplaceRoutes.get("/consultations", asyncHandler(doctorMarketplaceController.consultations));
doctorMarketplaceRoutes.get("/consultations/:id/messages", validate(reportIdSchema, "params"), asyncHandler(doctorMarketplaceController.messages));
doctorMarketplaceRoutes.post("/consultations/:id/messages", validate(reportIdSchema, "params"), validate(consultationMessageSchema), asyncHandler(doctorMarketplaceController.sendMessage));
doctorMarketplaceRoutes.patch("/admin/doctors/:id/verification", requireRoles("Admin"), validate(reportIdSchema, "params"), validate(doctorVerificationSchema), asyncHandler(doctorMarketplaceController.verify));
