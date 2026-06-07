import crypto from "node:crypto";
import { env } from "../config/env.js";
import { isOpayMockMode } from "../config/startupValidation.js";
import { errors } from "../utils/errors.js";

function requireOpayConfig() {
  if (isOpayMockMode()) return;
  if (!env.OPAY_MERCHANT_ID || !env.OPAY_PUBLIC_KEY || !env.OPAY_SECRET_KEY) {
    throw errors.config("OPay merchant credentials must be configured before accepting payments.");
  }
}

function signatureFor(payload) {
  if (isOpayMockMode()) return `mock-${crypto.createHash("sha256").update(payload).digest("hex")}`;
  return crypto.createHmac("sha512", env.OPAY_SECRET_KEY).update(payload).digest("hex");
}

function mockTransactionId(reference, prefix = "MOCK-TXN") {
  return `${prefix}-${crypto.createHash("sha256").update(reference).digest("hex").slice(0, 16).toUpperCase()}`;
}

function mockPaymentPayload(body, status = "SUCCESS") {
  const reference = body.reference || body.merchantOrderNo || body.orderNo;
  const total = Number(body?.amount?.total || body.amount || 0);
  const currency = String(body?.amount?.currency || body.currency || env.OPAY_CURRENCY).toUpperCase();
  return {
    code: "SUCCESS",
    message: "Development OPay simulator approved the transaction.",
    data: {
      reference,
      orderNo: mockTransactionId(reference),
      transactionId: mockTransactionId(reference),
      status,
      paymentStatus: status,
      amount: { total, currency },
      cashierUrl: `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/payment-success?reference=${encodeURIComponent(reference)}&simulated=true`
    },
    simulated: true
  };
}

async function opayPost(path, body, { usePublicKey = false } = {}) {
  requireOpayConfig();
  if (isOpayMockMode()) return mockPaymentPayload(body);
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
    if (isOpayMockMode()) {
      return Promise.resolve(mockPaymentPayload({ ...body, reference: body.reference || body.orderNo }));
    }
    return opayPost("/api/v1/international/cashier/status", body);
  },

  refundPayment(body) {
    if (isOpayMockMode()) {
      return Promise.resolve({
        code: "SUCCESS",
        message: "Development OPay simulator approved the refund.",
        data: {
          reference: body.reference,
          refundNo: mockTransactionId(body.refundReference || body.reference, "MOCK-REFUND"),
          status: "SUCCESS",
          amount: body.amount
        },
        simulated: true
      });
    }
    return opayPost("/api/v1/international/cashier/refund", body);
  },

  checkoutUrlFrom,
  verifiedFrom,
  signatureForPayload(rawBody) {
    if (isOpayMockMode()) return signatureFor(rawBody);
    const secret = env.OPAY_WEBHOOK_SECRET || env.OPAY_SECRET_KEY;
    if (!secret) return "";
    return crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  }
};
