import { env } from "../config/env.js";
import { withTransaction } from "../config/database.js";
import { billingRepository } from "../repositories/billingRepository.js";
import { createId } from "../utils/uuid.js";
import { errors } from "../utils/errors.js";
import { opayClient } from "./opayClient.js";
import { entitlementService } from "./entitlementService.js";

function callbackUrls(reference) {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, "");
  return {
    returnUrl: `${base}/payment-success?reference=${encodeURIComponent(reference)}`,
    cancelUrl: `${base}/payment-failed?reference=${encodeURIComponent(reference)}`,
    callbackUrl: `${base}/api/payments/opay/webhook`
  };
}

function buildReference() {
  return `MX-${createId()}`;
}

function normalizeProviderReference(payload) {
  return payload?.reference || payload?.data?.reference || payload?.orderNo || payload?.data?.orderNo || payload?.merchantOrderNo || null;
}

async function activateVerifiedPayment(payment, client) {
  if (!payment || payment.status === "verified") return payment;
  const plan = await billingRepository.findPlanByCode(payment.plan_code, client);
  const updatedPayment = await billingRepository.updatePaymentStatus({ providerReference: payment.provider_reference, status: "verified" }, client);
  const subscription = await billingRepository.activateSubscription({
    userId: updatedPayment.user_id,
    planId: updatedPayment.plan_id,
    interval: plan.interval,
    paymentId: updatedPayment.id
  }, client);
  await billingRepository.upsertEntitlements({ userId: updatedPayment.user_id, subscriptionId: subscription.id, plan }, client);
  await billingRepository.createBillingEvent({
    userId: updatedPayment.user_id,
    subscriptionId: subscription.id,
    paymentId: updatedPayment.id,
    eventType: "payment.verified",
    providerReference: updatedPayment.provider_reference
  }, client);
  return updatedPayment;
}

export const subscriptionService = {
  plans() {
    return billingRepository.listPlans();
  },

  async me(user) {
    const [plans, entitlementStatus, billingHistory] = await Promise.all([
      billingRepository.listPlans(),
      entitlementService.status(user),
      billingRepository.billingHistory(user.id)
    ]);
    return { plans, ...entitlementStatus, billingHistory };
  },

  async initializeCheckout({ user, planCode }) {
    if (user.role !== "Patient") throw errors.forbidden("Only patients can purchase subscriptions.");
    const plan = await billingRepository.findPlanByCode(planCode);
    if (!plan || plan.code === "FREE") throw errors.badRequest("Select a paid subscription plan.");

    const reference = buildReference();
    const urls = callbackUrls(reference);
    const requestBody = {
      merchantId: env.OPAY_MERCHANT_ID,
      reference,
      country: env.OPAY_COUNTRY,
      amount: { total: plan.price_cents, currency: plan.currency || env.OPAY_CURRENCY },
      productName: plan.name,
      productDescription: `MedExplain AI ${plan.name}`,
      userClientIP: "127.0.0.1",
      ...urls
    };

    const attempt = await billingRepository.createPaymentAttempt({
      userId: user.id,
      planId: plan.id,
      providerReference: reference,
      amountCents: plan.price_cents,
      currency: plan.currency || env.OPAY_CURRENCY,
      rawRequest: { ...requestBody, merchantId: "***" }
    });
    const providerResponse = await opayClient.createCashierPayment(requestBody);
    const checkoutUrl = opayClient.checkoutUrlFrom(providerResponse);
    if (!checkoutUrl) throw errors.badRequest("OPay did not return a checkout URL.");
    const payment = await billingRepository.createPayment({
      userId: user.id,
      planId: plan.id,
      attemptId: attempt.id,
      providerReference: reference,
      amountCents: plan.price_cents,
      currency: plan.currency || env.OPAY_CURRENCY,
      checkoutUrl
    });
    await billingRepository.attachPaymentToAttempt({ attemptId: attempt.id, paymentId: payment.id, checkoutUrl, rawResponse: providerResponse });
    await billingRepository.createPaymentTransaction({
      paymentId: payment.id,
      status: "initialized",
      amountCents: plan.price_cents,
      currency: plan.currency || env.OPAY_CURRENCY,
      rawResponse: providerResponse
    });
    await billingRepository.createBillingEvent({ userId: user.id, paymentId: payment.id, eventType: "payment.initialized", providerReference: reference });
    return { reference, checkoutUrl, payment };
  },

  async verifyPayment({ reference, actor = null }) {
    const payment = await billingRepository.findPaymentByReference(reference);
    if (!payment) throw errors.notFound("Payment not found.");
    const providerResponse = await opayClient.verifyPayment({ merchantId: env.OPAY_MERCHANT_ID, reference });
    if (!opayClient.verifiedFrom(providerResponse)) {
      await billingRepository.updatePaymentStatus({
        providerReference: reference,
        status: "failed",
        failureReason: "OPay verification did not confirm payment.",
        rawResponse: providerResponse
      });
      throw errors.badRequest("Payment has not been verified by OPay.");
    }
    return withTransaction(async (client) => {
      const updated = await activateVerifiedPayment({ ...payment, status: payment.status, verified_by: actor?.id || null }, client);
      await billingRepository.createPaymentTransaction({
        paymentId: payment.id,
        status: "verified",
        amountCents: payment.amount_cents,
        currency: payment.currency,
        providerTransactionId: providerResponse?.data?.orderNo || providerResponse?.orderNo || null,
        rawResponse: providerResponse
      }, client);
      return updated;
    });
  },

  async processWebhook({ payload, rawBody, signature }) {
    const expected = opayClient.signatureForPayload(rawBody);
    const signatureValid = Boolean(signature && expected && signature.toLowerCase() === expected.toLowerCase());
    const reference = normalizeProviderReference(payload);
    const replayKey = payload?.eventId || payload?.transactionId || payload?.orderNo || reference;
    const eventType = payload?.event || payload?.type || "opay.payment";
    const webhook = await billingRepository.recordWebhook({
      eventId: payload?.eventId || replayKey,
      eventType,
      payload,
      signature,
      replayKey,
      signatureValid,
      providerReference: reference
    });
    if (!webhook) return { duplicate: true };
    if (!signatureValid) throw errors.forbidden("Invalid OPay webhook signature.");
    if (!reference) throw errors.badRequest("Webhook did not include a payment reference.");
    const payment = await billingRepository.findPaymentByReference(reference);
    if (!payment) throw errors.notFound("Payment not found.");
    if (opayClient.verifiedFrom(payload)) {
      const updated = await withTransaction(async (client) => {
        const verified = await activateVerifiedPayment(payment, client);
        await billingRepository.createPaymentTransaction({
          paymentId: payment.id,
          status: "verified",
          amountCents: payment.amount_cents,
          currency: payment.currency,
          providerTransactionId: payload?.data?.orderNo || payload?.orderNo || null,
          rawResponse: payload
        }, client);
        return verified;
      });
      return { payment: updated };
    }
    await billingRepository.updatePaymentStatus({ providerReference: reference, status: "failed", rawResponse: payload });
    return { payment: await billingRepository.findPaymentByReference(reference) };
  },

  async cancel(user) {
    const subscription = await billingRepository.currentSubscription(user.id);
    if (!subscription) throw errors.notFound("Active subscription not found.");
    return billingRepository.cancelSubscription({ userId: user.id, subscriptionId: subscription.id });
  },

  billingHistory(user) {
    return billingRepository.billingHistory(user.id);
  },

  async refund({ user, paymentId, reason }) {
    const history = await billingRepository.billingHistory(user.id);
    const payment = history.find((item) => item.id === paymentId);
    if (!payment || payment.status !== "verified") throw errors.badRequest("Only verified payments can be refunded.");
    const providerResponse = await opayClient.refundPayment({
      merchantId: env.OPAY_MERCHANT_ID,
      reference: payment.provider_reference,
      refundReference: `RF-${createId()}`,
      amount: { total: payment.amount_cents, currency: payment.currency },
      reason
    });
    const refund = await billingRepository.createRefund({
      paymentId,
      reason,
      amountCents: payment.amount_cents,
      providerRefundId: providerResponse?.data?.refundNo || providerResponse?.refundNo || null,
      rawResponse: providerResponse
    });
    await billingRepository.createPaymentTransaction({
      paymentId,
      status: "refunded",
      amountCents: payment.amount_cents,
      currency: payment.currency,
      providerTransactionId: providerResponse?.data?.refundNo || providerResponse?.refundNo || null,
      rawResponse: providerResponse
    });
    await billingRepository.updatePaymentStatus({ providerReference: payment.provider_reference, status: "refunded", rawResponse: providerResponse });
    return refund;
  },

  adminMetrics() {
    return billingRepository.adminMetrics();
  }
};
