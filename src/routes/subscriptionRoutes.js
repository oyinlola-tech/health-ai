import { Router } from "express";
import { subscriptionController } from "../controllers/subscriptionController.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { abuseBanGuard, couponRateLimit, paymentRateLimit, webhookRateLimit } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkoutSchema, paymentReferenceSchema, refundSchema } from "../validators/subscriptionValidators.js";
import { validateCouponSchema } from "../modules/promotions/coupon.validators.js";

export const subscriptionRoutes = Router();

subscriptionRoutes.post("/payments/opay/webhook", abuseBanGuard("payment-webhook"), webhookRateLimit, asyncHandler(subscriptionController.webhook));

subscriptionRoutes.use(authenticate);
subscriptionRoutes.get("/subscriptions/plans", asyncHandler(subscriptionController.plans));
subscriptionRoutes.get("/subscriptions/me", asyncHandler(subscriptionController.me));
subscriptionRoutes.post("/subscriptions/coupons/validate", abuseBanGuard("coupon"), couponRateLimit, validate(validateCouponSchema), asyncHandler(subscriptionController.validateCoupon));
subscriptionRoutes.post("/subscriptions/checkout", abuseBanGuard("payment"), paymentRateLimit, validate(checkoutSchema), asyncHandler(subscriptionController.checkout));
subscriptionRoutes.post("/subscriptions/verify", abuseBanGuard("payment"), paymentRateLimit, validate(paymentReferenceSchema), asyncHandler(subscriptionController.verify));
subscriptionRoutes.post("/subscriptions/cancel", asyncHandler(subscriptionController.cancel));
subscriptionRoutes.get("/subscriptions/billing-history", asyncHandler(subscriptionController.billingHistory));
subscriptionRoutes.post("/subscriptions/refunds", abuseBanGuard("payment"), paymentRateLimit, validate(refundSchema), asyncHandler(subscriptionController.refund));
