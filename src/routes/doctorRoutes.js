import { Router } from "express";
import { doctorController } from "../controllers/doctorController.js";
import { authenticate, requireRoles } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const doctorRoutes = Router();

doctorRoutes.use(authenticate, requireRoles("Doctor"));
doctorRoutes.get("/appointments", asyncHandler(doctorController.appointments));
doctorRoutes.get("/reports", asyncHandler(doctorController.reports));
