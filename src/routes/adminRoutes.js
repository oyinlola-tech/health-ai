import { Router } from "express";
import { adminController } from "../controllers/adminController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createDoctorSchema } from "../validators/authValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRoles("Admin"));
adminRoutes.get("/users", asyncHandler(adminController.users));
adminRoutes.post("/doctors", validate(createDoctorSchema), auditAction("admin.doctor.create"), asyncHandler(adminController.createDoctor));
adminRoutes.get("/analytics", asyncHandler(adminController.analytics));
adminRoutes.get("/audit-logs", asyncHandler(adminController.auditLogs));
