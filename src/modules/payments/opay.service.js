import crypto from "node:crypto";
import { opayClient } from "../../services/opayClient.js";
import { subscriptionService } from "./subscription.service.js";

export function generateTransactionReference(prefix = "MX") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = cryptoRandom();
  return `${prefix}-${timestamp}-${random}`;
}

function cryptoRandom() {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

export const opayService = {
  initializePayment(input) {
    return subscriptionService.initializeCheckout(input);
  },

  verifyPayment(input) {
    return subscriptionService.verifyPayment(input);
  },

  createPaymentRequest(body) {
    return opayClient.createCashierPayment(body);
  },

  verifyProviderPayment(body) {
    return opayClient.verifyPayment(body);
  },

  checkoutUrlFrom(payload) {
    return opayClient.checkoutUrlFrom(payload);
  }
};
