import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPlans: vi.fn(),
  findPlanByCode: vi.fn(),
  currentSubscription: vi.fn(),
  usageForUser: vi.fn(),
  createPaymentAttempt: vi.fn(),
  createPayment: vi.fn(),
  attachPaymentToAttempt: vi.fn(),
  createBillingEvent: vi.fn(),
  findPaymentByReference: vi.fn(),
  updatePaymentStatus: vi.fn(),
  activateSubscription: vi.fn(),
  upsertEntitlements: vi.fn(),
  cancelSubscription: vi.fn(),
  billingHistory: vi.fn(),
  createRefund: vi.fn(),
  createPaymentTransaction: vi.fn(),
  adminMetrics: vi.fn(),
  recordWebhook: vi.fn(),
  createCashierPayment: vi.fn(),
  verifyPayment: vi.fn(),
  refundPayment: vi.fn(),
  checkoutUrlFrom: vi.fn(),
  verifiedFrom: vi.fn(),
  signatureForPayload: vi.fn(),
  tx: vi.fn((callback) => callback({ query: vi.fn() }))
}));

vi.mock("../src/config/database.js", () => ({
  withTransaction: mocks.tx,
  pool: {}
}));

vi.mock("../src/repositories/billingRepository.js", () => ({
  billingRepository: {
    listPlans: mocks.listPlans,
    findPlanByCode: mocks.findPlanByCode,
    currentSubscription: mocks.currentSubscription,
    usageForUser: mocks.usageForUser,
    createPaymentAttempt: mocks.createPaymentAttempt,
    createPayment: mocks.createPayment,
    attachPaymentToAttempt: mocks.attachPaymentToAttempt,
    createBillingEvent: mocks.createBillingEvent,
    findPaymentByReference: mocks.findPaymentByReference,
    updatePaymentStatus: mocks.updatePaymentStatus,
    activateSubscription: mocks.activateSubscription,
    upsertEntitlements: mocks.upsertEntitlements,
    cancelSubscription: mocks.cancelSubscription,
    billingHistory: mocks.billingHistory,
    createRefund: mocks.createRefund,
    createPaymentTransaction: mocks.createPaymentTransaction,
    adminMetrics: mocks.adminMetrics,
    recordWebhook: mocks.recordWebhook
  }
}));

vi.mock("../src/services/opayClient.js", () => ({
  opayClient: {
    createCashierPayment: mocks.createCashierPayment,
    verifyPayment: mocks.verifyPayment,
    refundPayment: mocks.refundPayment,
    checkoutUrlFrom: mocks.checkoutUrlFrom,
    verifiedFrom: mocks.verifiedFrom,
    signatureForPayload: mocks.signatureForPayload
  }
}));

const user = { id: "018f0000-0000-7000-8000-000000000100", role: "Patient" };
const premiumPlan = {
  id: "018f0000-0000-7000-8000-000000000002",
  code: "PREMIUM_MONTHLY",
  name: "Premium Monthly",
  price_cents: 500000,
  currency: "NGN",
  interval: "month",
  report_analysis_limit: null,
  ai_chat_limit: null,
  doctor_consultations_enabled: true,
  health_trends_enabled: true,
  priority_processing_enabled: true,
  advanced_ai_enabled: true
};

async function loadService() {
  vi.stubEnv("OPAY_MERCHANT_ID", "merchant");
  vi.stubEnv("OPAY_PUBLIC_KEY", "public");
  vi.stubEnv("OPAY_SECRET_KEY", "secret");
  vi.stubEnv("PUBLIC_APP_URL", "http://localhost:3000");
  const { subscriptionService } = await import("../src/services/subscriptionService.js");
  return subscriptionService;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.findPlanByCode.mockResolvedValue(premiumPlan);
  mocks.createPaymentAttempt.mockResolvedValue({ id: "attempt-id" });
  mocks.createPayment.mockResolvedValue({ id: "payment-id", provider_reference: "MX-reference" });
  mocks.attachPaymentToAttempt.mockResolvedValue({});
  mocks.createBillingEvent.mockResolvedValue({});
  mocks.createPaymentTransaction.mockResolvedValue({});
  mocks.createCashierPayment.mockResolvedValue({ data: { cashierUrl: "https://checkout.opay.test/pay" } });
  mocks.checkoutUrlFrom.mockReturnValue("https://checkout.opay.test/pay");
});

describe("subscriptionService OPay checkout", () => {
  it("initializes checkout server-side and returns the OPay checkout URL", async () => {
    const subscriptionService = await loadService();

    const result = await subscriptionService.initializeCheckout({ user, planCode: "PREMIUM_MONTHLY" });

    expect(result.checkoutUrl).toBe("https://checkout.opay.test/pay");
    expect(mocks.createCashierPayment).toHaveBeenCalledWith(expect.objectContaining({ merchantId: "merchant", productName: "Premium Monthly" }));
    expect(mocks.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 500000, currency: "NGN" }));
    expect(mocks.createPaymentTransaction).toHaveBeenCalledWith(expect.objectContaining({ status: "initialized" }));
  });

  it("verifies payment with OPay before activating premium", async () => {
    const subscriptionService = await loadService();
    mocks.findPaymentByReference.mockResolvedValue({
      id: "payment-id",
      user_id: user.id,
      plan_id: premiumPlan.id,
      plan_code: premiumPlan.code,
      status: "pending",
      provider_reference: "MX-reference"
    });
    mocks.verifyPayment.mockResolvedValue({ data: { status: "SUCCESS" } });
    mocks.verifiedFrom.mockReturnValue(true);
    mocks.updatePaymentStatus.mockResolvedValue({ id: "payment-id", user_id: user.id, plan_id: premiumPlan.id, provider_reference: "MX-reference" });
    mocks.activateSubscription.mockResolvedValue({ id: "subscription-id" });

    await subscriptionService.verifyPayment({ reference: "MX-reference", actor: user });

    expect(mocks.verifyPayment).toHaveBeenCalledWith({ merchantId: "merchant", reference: "MX-reference" });
    expect(mocks.activateSubscription).toHaveBeenCalled();
    expect(mocks.upsertEntitlements).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, plan: premiumPlan }), expect.anything());
    expect(mocks.createPaymentTransaction).toHaveBeenCalledWith(expect.objectContaining({ status: "verified" }), expect.anything());
  });
});

describe("subscriptionService webhooks and refunds", () => {
  it("rejects webhooks with invalid signatures before trusting status", async () => {
    const subscriptionService = await loadService();
    mocks.signatureForPayload.mockReturnValue("expected");
    mocks.recordWebhook.mockResolvedValue({ id: "webhook-id" });

    await expect(
      subscriptionService.processWebhook({
        payload: { reference: "MX-reference", status: "SUCCESS" },
        rawBody: '{"reference":"MX-reference"}',
        signature: "wrong"
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.findPaymentByReference).not.toHaveBeenCalled();
  });

  it("creates refund requests through OPay for verified user payments", async () => {
    const subscriptionService = await loadService();
    mocks.billingHistory.mockResolvedValue([{ id: "payment-id", status: "verified", amount_cents: 500000, currency: "NGN", provider_reference: "MX-reference" }]);
    mocks.refundPayment.mockResolvedValue({ data: { refundNo: "refund-no" } });
    mocks.createRefund.mockResolvedValue({ id: "refund-id", status: "processing" });
    mocks.updatePaymentStatus.mockResolvedValue({});

    const refund = await subscriptionService.refund({ user, paymentId: "payment-id", reason: "Duplicate charge" });

    expect(refund.id).toBe("refund-id");
    expect(mocks.refundPayment).toHaveBeenCalledWith(expect.objectContaining({ reference: "MX-reference" }));
    expect(mocks.createPaymentTransaction).toHaveBeenCalledWith(expect.objectContaining({ status: "refunded" }));
  });
});
