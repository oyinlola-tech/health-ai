import { Router } from "express";
import { authenticate, requireRoles } from "../../middlewares/auth.js";
import { abuseBanGuard, couponRateLimit } from "../../middlewares/rateLimit.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { couponController } from "./coupon.controller.js";
import { createCouponSchema } from "./coupon.validators.js";

export const couponRoutes = Router();

couponRoutes.use(authenticate, requireRoles("Admin"));
couponRoutes.get("/coupons", asyncHandler(couponController.list));
couponRoutes.post("/coupons", abuseBanGuard("coupon-admin"), couponRateLimit, validate(createCouponSchema), asyncHandler(couponController.create));
couponRoutes.get("/coupons/:id/usage", asyncHandler(couponController.usage));
couponRoutes.post("/coupons/:id/disable", asyncHandler(couponController.disable));
