import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { refreshTokenCookieGuard } from "../middlewares/refreshTokenCookieGuard.js";
import { authRateLimit, sensitiveAuthRateLimit } from "../middlewares/rateLimit.js";
import { emailVerifySchema, loginSchema, passwordResetConfirmSchema, passwordResetRequestSchema, registerSchema } from "../validators/authValidators.js";
import { auditAction } from "../middlewares/audit.js";

export const authRoutes = Router();

authRoutes.post("/register", authRateLimit, validate(registerSchema), auditAction("auth.register"), asyncHandler(authController.register));
authRoutes.post("/login", authRateLimit, validate(loginSchema), auditAction("auth.login"), asyncHandler(authController.login));
authRoutes.post("/logout", authenticate, sensitiveAuthRateLimit, auditAction("auth.logout"), asyncHandler(authController.logout));
authRoutes.post("/refresh", sensitiveAuthRateLimit, refreshTokenCookieGuard, asyncHandler(authController.refresh));
authRoutes.post("/password-reset/request", authRateLimit, validate(passwordResetRequestSchema), auditAction("auth.password_reset.request"), asyncHandler(authController.requestPasswordReset));
authRoutes.post("/password-reset/confirm", authRateLimit, validate(passwordResetConfirmSchema), auditAction("auth.password_reset.confirm"), asyncHandler(authController.resetPassword));
authRoutes.post("/email/verify", sensitiveAuthRateLimit, validate(emailVerifySchema), auditAction("auth.email.verify"), asyncHandler(authController.verifyEmail));
