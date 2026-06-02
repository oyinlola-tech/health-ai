import { Router } from "express";
import { notificationController } from "../controllers/notificationController.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditAction } from "../middlewares/audit.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);
notificationRoutes.get("/", asyncHandler(notificationController.list));
notificationRoutes.patch("/:id/read", auditAction("notification.mark_read"), asyncHandler(notificationController.markRead));
