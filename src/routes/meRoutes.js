import { Router } from "express";
import { meController } from "../controllers/meController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { changePasswordSchema, updateProfileSchema, updateSettingsSchema } from "../validators/authValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const meRoutes = Router();

meRoutes.use(authenticate);
meRoutes.get("/", meController.me);
meRoutes.put("/", validate(updateProfileSchema), auditAction("profile.update"), asyncHandler(meController.update));
meRoutes.get("/settings", meController.settings);
meRoutes.put("/settings", validate(updateSettingsSchema), auditAction("settings.update"), asyncHandler(meController.updateSettings));
meRoutes.put("/password", validate(changePasswordSchema), auditAction("settings.password_change"), asyncHandler(meController.changePassword));
