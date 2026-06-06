import { couponService } from "./coupon.service.js";
import { sendSuccess } from "../../utils/response.js";

export const couponController = {
  async create(req, res) {
    return sendSuccess(res, { coupon: await couponService.createCoupon(req.body, req.user) }, {}, 201);
  },

  async list(_req, res) {
    return sendSuccess(res, { coupons: await couponService.listCoupons() });
  },

  async disable(req, res) {
    return sendSuccess(res, { coupon: await couponService.disableCoupon(req.params.id) });
  },

  async usage(req, res) {
    return sendSuccess(res, await couponService.usageStats(req.params.id));
  }
};
