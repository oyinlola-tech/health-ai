import crypto from "node:crypto";
import { withTransaction } from "../../config/database.js";
import { errors } from "../../utils/errors.js";
import { couponRepository } from "./coupon.repository.js";

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function generatedCode() {
  return `MED-${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

function discountFor(coupon, baseAmount) {
  const amount = Number(baseAmount || 0);
  if (coupon.discount_type === "percentage") return Math.min(amount, Math.floor((amount * Number(coupon.discount_value || 0)) / 100));
  return Math.min(amount, Number(coupon.discount_value || 0));
}

function assertCouponUsable(coupon) {
  if (!coupon) throw errors.notFound("Coupon was not found.");
  if (!coupon.is_active) throw errors.badRequest("Coupon is disabled.");
  if (coupon.expiry_date && new Date(coupon.expiry_date).getTime() <= Date.now()) throw errors.badRequest("Coupon has expired.");
  if (coupon.max_uses !== null && coupon.max_uses !== undefined && Number(coupon.used_count || 0) >= Number(coupon.max_uses)) {
    throw errors.badRequest("Coupon usage limit has been reached.");
  }
}

export const couponService = {
  generateCode: generatedCode,

  async createCoupon(input, actor) {
    const code = normalizeCode(input.code || generatedCode());
    if (!/^MED-[A-Z0-9]{6,12}$/.test(code)) throw errors.badRequest("Coupon codes must use the secure MED-XXXXXX format.");
    if (input.discountType === "percentage" && (Number(input.discountValue) <= 0 || Number(input.discountValue) > 100)) {
      throw errors.badRequest("Percentage discounts must be between 1 and 100.");
    }
    if (input.discountType === "fixed" && Number(input.discountValue) <= 0) throw errors.badRequest("Fixed discounts must be greater than zero.");

    return couponRepository.createCoupon({
      code,
      discountType: input.discountType,
      discountValue: Number(input.discountValue),
      maxUses: input.maxUses ?? null,
      expiryDate: input.expiryDate ?? null,
      isActive: input.isActive ?? true,
      createdBy: actor?.id || null
    });
  },

  listCoupons() {
    return couponRepository.listCoupons();
  },

  async disableCoupon(id) {
    const coupon = await couponRepository.disableCoupon(id);
    if (!coupon) throw errors.notFound("Coupon not found.");
    return coupon;
  },

  async usageStats(id) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw errors.notFound("Coupon not found.");
    return { coupon, redemptions: await couponRepository.usageStats(id) };
  },

  async validateCoupon({ code, userId, baseAmount }) {
    const coupon = await couponRepository.findByCode(normalizeCode(code));
    assertCouponUsable(coupon);
    const existing = await couponRepository.findRedemption({ userId, couponId: coupon.id });
    if (existing) throw errors.badRequest("Coupon has already been used by this account.");
    const discountAmount = discountFor(coupon, baseAmount);
    const finalAmount = Math.max(0, Number(baseAmount || 0) - discountAmount);
    return { coupon, discountAmount, finalAmount };
  },

  async redeemCoupon({ code, userId, planId, paymentId = null, baseAmount }, client) {
    const run = async (tx) => {
      const coupon = await couponRepository.findByCode(normalizeCode(code), tx, true);
      assertCouponUsable(coupon);
      const existing = await couponRepository.findRedemption({ userId, couponId: coupon.id }, tx);
      if (existing) throw errors.badRequest("Coupon has already been used by this account.");
      const discountAmount = discountFor(coupon, baseAmount);
      const finalAmount = Math.max(0, Number(baseAmount || 0) - discountAmount);
      const redemption = await couponRepository.redeem({ userId, couponId: coupon.id, paymentId, planId, discountAmount, finalAmount }, tx);
      return { coupon, redemption, discountAmount, finalAmount };
    };
    return client ? run(client) : withTransaction(run);
  },

  previewDiscount({ coupon, baseAmount }) {
    const discountAmount = discountFor(coupon, baseAmount);
    return { discountAmount, finalAmount: Math.max(0, Number(baseAmount || 0) - discountAmount) };
  }
};
