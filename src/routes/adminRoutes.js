import { Router } from "express";
import { adminController } from "../controllers/adminController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createDoctorSchema } from "../validators/authValidators.js";
import { auditAction } from "../middlewares/audit.js";
import { couponRoutes } from "../modules/promotions/coupon.routes.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRoles("Admin"));
adminRoutes.get("/users", asyncHandler(adminController.users));
adminRoutes.post("/doctors", validate(createDoctorSchema), auditAction("admin.doctor.create"), asyncHandler(adminController.createDoctor));
adminRoutes.get("/analytics", asyncHandler(adminController.analytics));
adminRoutes.get("/monetization", asyncHandler(adminController.monetization));
adminRoutes.get("/ai-costs", asyncHandler(adminController.aiCosts));
adminRoutes.get("/reports/processing-metrics", asyncHandler(adminController.reportProcessingMetrics));
adminRoutes.get("/audit-logs", asyncHandler(adminController.auditLogs));
adminRoutes.use("/", couponRoutes);
