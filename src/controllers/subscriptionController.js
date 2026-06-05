import { subscriptionService } from "../services/subscriptionService.js";
import { sendSuccess } from "../utils/response.js";

export const subscriptionController = {
  async plans(_req, res) {
    return sendSuccess(res, { plans: await subscriptionService.plans() });
  },

  async me(req, res) {
    return sendSuccess(res, await subscriptionService.me(req.user));
  },

  async checkout(req, res) {
    return sendSuccess(res, await subscriptionService.initializeCheckout({ user: req.user, planCode: req.body.planCode }), {}, 201);
  },

  async verify(req, res) {
    return sendSuccess(res, { payment: await subscriptionService.verifyPayment({ reference: req.body.reference, actor: req.user }) });
  },

  async webhook(req, res) {
    const signature = req.get("X-OPay-Signature") || req.get("MerchantSignature") || req.get("OPay-Signature") || "";
    return sendSuccess(res, await subscriptionService.processWebhook({ payload: req.body, rawBody: req.rawBody || JSON.stringify(req.body), signature }));
  },

  async cancel(req, res) {
    return sendSuccess(res, { subscription: await subscriptionService.cancel(req.user) });
  },

  async billingHistory(req, res) {
    return sendSuccess(res, { payments: await subscriptionService.billingHistory(req.user) });
  },

  async refund(req, res) {
    return sendSuccess(res, { refund: await subscriptionService.refund({ user: req.user, ...req.body }) }, {}, 201);
  }
};
