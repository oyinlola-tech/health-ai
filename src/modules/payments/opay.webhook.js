import { subscriptionService } from "./subscription.service.js";

export function signatureFromRequest(req) {
  return req.get("X-OPay-Signature") || req.get("MerchantSignature") || req.get("OPay-Signature") || "";
}

export const opayWebhook = {
  process({ payload, rawBody, signature }) {
    return subscriptionService.processWebhook({ payload, rawBody, signature });
  },

  fromRequest(req) {
    return this.process({
      payload: req.body,
      rawBody: req.rawBody || JSON.stringify(req.body),
      signature: signatureFromRequest(req)
    });
  }
};
