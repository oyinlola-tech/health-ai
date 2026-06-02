import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import { authRateLimit } from "../middlewares/rateLimit.js";
import { emailVerifySchema, loginSchema, passwordResetConfirmSchema, passwordResetRequestSchema, registerSchema } from "../validators/authValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const authRoutes = Router();

authRoutes.get("/csrf", authController.csrf);
authRoutes.post("/register", authRateLimit, validate(registerSchema), auditAction("auth.register"), asyncHandler(authController.register));
authRoutes.post("/login", authRateLimit, validate(loginSchema), auditAction("auth.login"), asyncHandler(authController.login));
authRoutes.post("/logout", auditAction("auth.logout"), asyncHandler(authController.logout));
authRoutes.post("/refresh", asyncHandler(authController.refresh));
authRoutes.post("/password-reset/request", authRateLimit, validate(passwordResetRequestSchema), auditAction("auth.password_reset.request"), asyncHandler(authController.requestPasswordReset));
authRoutes.post("/password-reset/confirm", authRateLimit, validate(passwordResetConfirmSchema), auditAction("auth.password_reset.confirm"), asyncHandler(authController.resetPassword));
authRoutes.post("/email/verify", validate(emailVerifySchema), auditAction("auth.email.verify"), asyncHandler(authController.verifyEmail));
