import { env } from "../config/env.js";
import { withTransaction } from "../config/database.js";
import { billingRepository } from "../repositories/billingRepository.js";
import { createId } from "../utils/uuid.js";
import { errors } from "../utils/errors.js";
import { opayClient } from "./opayClient.js";
import { entitlementService } from "./entitlementService.js";
import { safeEqual } from "../utils/crypto.js";
import { consentTypes, legalService } from "./legalService.js";
import { couponService } from "../modules/promotions/coupon.service.js";

function callbackUrls(reference) {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, "");
  return {
    returnUrl: `${base}/payment-success?reference=${encodeURIComponent(reference)}`,
    cancelUrl: `${base}/payment-failed?reference=${encodeURIComponent(reference)}`,
    callbackUrl: `${base}/api/payments/opay/webhook`
  };
}

function buildReference(prefix = "MX") {
  return `${prefix}-${createId()}`;
}

function normalizeProviderReference(payload) {
  return payload?.reference || payload?.data?.reference || payload?.orderNo || payload?.data?.orderNo || payload?.merchantOrderNo || null;
}

function providerAmount(payload) {
  return Number(payload?.data?.amount?.total || payload?.amount?.total || payload?.data?.amount || payload?.amount || 0);
}

function providerCurrency(payload) {
  return String(payload?.data?.amount?.currency || payload?.amount?.currency || payload?.data?.currency || payload?.currency || "").toUpperCase();
}

function assertPaymentIntegrity(payment, providerPayload) {
  const amount = providerAmount(providerPayload);
  const currency = providerCurrency(providerPayload);
  if (amount && amount !== Number(payment.amount_cents)) {
    throw errors.forbidden("Payment amount integrity check failed.");
  }
  if (currency && currency !== String(payment.currency).toUpperCase()) {
    throw errors.forbidden("Payment currency integrity check failed.");
  }
}

function providerTransactionId(payload) {
  return payload?.data?.orderNo || payload?.orderNo || payload?.transactionId || payload?.data?.transactionId || null;
}

function detectFraudFlags(payment, providerPayload) {
  const flags = [];
  const amount = providerAmount(providerPayload);
  const currency = providerCurrency(providerPayload);
  const reference = normalizeProviderReference(providerPayload);
  if (reference && reference !== payment.provider_reference) flags.push("reference_mismatch");
  if (amount && amount !== Number(payment.amount_cents)) flags.push("amount_mismatch");
  if (currency && currency !== String(payment.currency).toUpperCase()) flags.push("currency_mismatch");
  return flags;
}

async function assertUniqueProviderTransaction(providerTransactionId, paymentId, client) {
  if (!billingRepository.findPaymentTransaction) return;
  const existing = await billingRepository.findPaymentTransaction(providerTransactionId, client);
  if (existing && existing.payment_id !== paymentId) throw errors.forbidden("Duplicate provider transaction detected.");
}

async function flagPaymentFraud({ paymentId, providerReference, flags }, client) {
  if (!billingRepository.flagPaymentFraud) return null;
  return billingRepository.flagPaymentFraud({ paymentId, providerReference, flags }, client);
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

  async initializeCheckout({ user, planCode, couponCode = null }) {
    if (user.role !== "Patient") throw errors.forbidden("Only patients can purchase subscriptions.");
    const plan = await billingRepository.findPlanByCode(planCode);
    if (!plan || plan.code === "FREE") throw errors.badRequest("Select a paid subscription plan.");
    const baseAmount = Number(plan.price_naira ?? plan.price_cents ?? 0);

    let discount = { coupon: null, discountAmount: 0, finalAmount: baseAmount };
    if (couponCode) {
      discount = await couponService.validateCoupon({ code: couponCode, userId: user.id, baseAmount });
    }

    if (discount.finalAmount > 0) {
      await legalService.requireConsent(user.id, consentTypes.PAYMENT_PROCESSING, "Payment processing consent is required before starting checkout.");
    }

    if (discount.finalAmount === 0) {
      return withTransaction(async (client) => {
        const redemption = couponCode
          ? await couponService.redeemCoupon({ code: couponCode, userId: user.id, planId: plan.id, baseAmount }, client)
          : null;
        const reference = buildReference("MX-FREE");
        const payment = await billingRepository.createPayment(
          {
            userId: user.id,
            planId: plan.id,
            provider: redemption ? "coupon" : "trial",
            providerReference: reference,
            purpose: redemption ? "subscription_coupon" : "subscription_trial",
            amountCents: 0,
            currency: "NGN",
            status: "verified",
            metadata: {
              baseAmount,
              discountAmount: discount.discountAmount,
              finalAmount: 0,
              couponCode: redemption?.coupon?.code || null,
              checkoutSkipped: true
            }
          },
          client
        );
        if (redemption?.redemption?.id) {
          await client.query("update coupon_redemptions set payment_id = $1 where id = $2", [payment.id, redemption.redemption.id]);
        }
        const subscription = await billingRepository.activateSubscription({
          userId: user.id,
          planId: plan.id,
          interval: plan.interval,
          paymentId: payment.id
        }, client);
        await billingRepository.upsertEntitlements({ userId: user.id, subscriptionId: subscription.id, plan }, client);
        await billingRepository.createPaymentTransaction({
          paymentId: payment.id,
          provider: payment.provider,
          status: "verified",
          amountCents: 0,
          currency: "NGN",
          rawResponse: { checkoutSkipped: true, reason: redemption ? "coupon_full_discount" : "trial" }
        }, client);
        await billingRepository.createBillingEvent({
          userId: user.id,
          subscriptionId: subscription.id,
          paymentId: payment.id,
          eventType: redemption ? "payment.coupon_verified" : "payment.trial_verified",
          providerReference: reference,
          metadata: { checkoutSkipped: true, baseAmount, discountAmount: discount.discountAmount }
        }, client);
        return {
          reference,
          checkoutSkipped: true,
          finalAmount: 0,
          baseAmount,
          discountAmount: discount.discountAmount,
          payment,
          subscription
        };
      });
    }

    const reference = buildReference();
    const urls = callbackUrls(reference);
    const requestBody = {
      merchantId: env.OPAY_MERCHANT_ID,
      reference,
      country: env.OPAY_COUNTRY,
      amount: { total: discount.finalAmount, currency: "NGN" },
      productName: plan.name,
      productDescription: `MedExplain AI ${plan.name}`,
      userClientIP: "127.0.0.1",
      ...urls
    };

    const attempt = await billingRepository.createPaymentAttempt({
      userId: user.id,
      planId: plan.id,
      providerReference: reference,
      amountCents: discount.finalAmount,
      currency: "NGN",
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
      amountCents: discount.finalAmount,
      currency: "NGN",
      checkoutUrl,
      metadata: {
        baseAmount,
        discountAmount: discount.discountAmount,
        finalAmount: discount.finalAmount,
        couponCode: discount.coupon?.code || null
      }
    });
    if (couponCode) {
      await couponService.redeemCoupon({ code: couponCode, userId: user.id, planId: plan.id, paymentId: payment.id, baseAmount });
    }
    await billingRepository.attachPaymentToAttempt({ attemptId: attempt.id, paymentId: payment.id, checkoutUrl, rawResponse: providerResponse });
    await billingRepository.createPaymentTransaction({
      paymentId: payment.id,
      status: "initialized",
      amountCents: discount.finalAmount,
      currency: "NGN",
      rawResponse: providerResponse
    });
    await billingRepository.createBillingEvent({ userId: user.id, paymentId: payment.id, eventType: "payment.initialized", providerReference: reference });
    return { reference, checkoutUrl, payment, checkoutSkipped: false, baseAmount, discountAmount: discount.discountAmount, finalAmount: discount.finalAmount };
  },

  async validateCoupon({ user, planCode, couponCode }) {
    const plan = await billingRepository.findPlanByCode(planCode);
    if (!plan || plan.code === "FREE") throw errors.badRequest("Select a paid subscription plan.");
    const baseAmount = Number(plan.price_naira ?? plan.price_cents ?? 0);
    const discount = await couponService.validateCoupon({ code: couponCode, userId: user.id, baseAmount });
    return {
      planCode: plan.code,
      baseAmount,
      discountAmount: discount.discountAmount,
      finalAmount: discount.finalAmount,
      coupon: {
        code: discount.coupon.code,
        discountType: discount.coupon.discount_type,
        discountValue: discount.coupon.discount_value,
        expiryDate: discount.coupon.expiry_date
      }
    };
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
    const fraudFlags = detectFraudFlags(payment, providerResponse);
    if (fraudFlags.length) {
      await flagPaymentFraud({ paymentId: payment.id, providerReference: reference, flags: fraudFlags });
      throw errors.forbidden("Payment failed fraud integrity checks.");
    }
    assertPaymentIntegrity(payment, providerResponse);
    return withTransaction(async (client) => {
      const transactionId = providerTransactionId(providerResponse);
      await assertUniqueProviderTransaction(transactionId, payment.id, client);
      const updated = await activateVerifiedPayment({ ...payment, status: payment.status, verified_by: actor?.id || null }, client);
      await billingRepository.createPaymentTransaction({
        paymentId: payment.id,
        status: "verified",
        amountCents: payment.amount_cents,
        currency: payment.currency,
        providerTransactionId: transactionId,
        rawResponse: providerResponse
      }, client);
      return updated;
    });
  },

  async processWebhook({ payload, rawBody, signature }) {
    if (!signature) throw errors.forbidden("Missing OPay webhook signature.");
    const expected = opayClient.signatureForPayload(rawBody);
    const signatureValid = Boolean(signature && expected && safeEqual(signature.toLowerCase(), expected.toLowerCase()));
    const reference = normalizeProviderReference(payload);
    const replayKey = payload?.eventId || providerTransactionId(payload) || reference;
    if (!replayKey) throw errors.badRequest("Webhook did not include a replay key.");
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
    const fraudFlags = detectFraudFlags(payment, payload);
    if (fraudFlags.length) {
      await flagPaymentFraud({ paymentId: payment.id, providerReference: reference, flags: fraudFlags });
      throw errors.forbidden("Webhook failed fraud integrity checks.");
    }
    assertPaymentIntegrity(payment, payload);
    if (opayClient.verifiedFrom(payload)) {
      const updated = await withTransaction(async (client) => {
        const transactionId = providerTransactionId(payload);
        await assertUniqueProviderTransaction(transactionId, payment.id, client);
        const verified = await activateVerifiedPayment(payment, client);
        await billingRepository.createPaymentTransaction({
          paymentId: payment.id,
          status: "verified",
          amountCents: payment.amount_cents,
          currency: payment.currency,
          providerTransactionId: transactionId,
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
