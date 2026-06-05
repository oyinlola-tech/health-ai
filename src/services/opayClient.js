import crypto from "node:crypto";
import { env } from "../config/env.js";
import { errors } from "../utils/errors.js";

function requireOpayConfig() {
  if (!env.OPAY_MERCHANT_ID || !env.OPAY_PUBLIC_KEY || !env.OPAY_SECRET_KEY) {
    throw errors.config("OPay merchant credentials must be configured before accepting payments.");
  }
}

function signatureFor(payload) {
  return crypto.createHmac("sha512", env.OPAY_SECRET_KEY).update(payload).digest("hex");
}

async function opayPost(path, body, { usePublicKey = false } = {}) {
  requireOpayConfig();
  const rawBody = JSON.stringify(body);
  const response = await fetch(`${env.OPAY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${usePublicKey ? env.OPAY_PUBLIC_KEY : env.OPAY_SECRET_KEY}`,
      MerchantId: env.OPAY_MERCHANT_ID,
      MerchantSignature: signatureFor(rawBody)
    },
    body: rawBody
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code === "FAIL") {
    throw errors.badRequest("OPay request failed.", { providerStatus: response.status, providerCode: payload.code });
  }
  return payload;
}

function checkoutUrlFrom(payload) {
  return payload?.data?.cashierUrl || payload?.data?.webCheckoutUrl || payload?.data?.payUrl || payload?.cashierUrl || null;
}

function verifiedFrom(payload) {
  const status = String(payload?.data?.status || payload?.status || payload?.data?.paymentStatus || "").toUpperCase();
  return ["SUCCESS", "SUCCEEDED", "PAID", "VERIFIED"].includes(status);
}

export const opayClient = {
  createCashierPayment(body) {
    return opayPost("/api/v1/international/cashier/create", body, { usePublicKey: true });
  },

  verifyPayment(body) {
    return opayPost("/api/v1/international/cashier/status", body);
  },

  refundPayment(body) {
    return opayPost("/api/v1/international/cashier/refund", body);
  },

  checkoutUrlFrom,
  verifiedFrom,
  signatureForPayload(rawBody) {
    const secret = env.OPAY_WEBHOOK_SECRET || env.OPAY_SECRET_KEY;
    if (!secret) return "";
    return crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  }
};
