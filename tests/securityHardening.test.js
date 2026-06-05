import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  billingFindPayment: vi.fn(),
  opayVerifyPayment: vi.fn(),
  opayVerifiedFrom: vi.fn(),
  userFindById: vi.fn()
}));

vi.mock("../src/repositories/billingRepository.js", () => ({
  billingRepository: {
    findPaymentByReference: mocks.billingFindPayment,
    findPlanByCode: vi.fn(),
    updatePaymentStatus: vi.fn(),
    activateSubscription: vi.fn(),
    upsertEntitlements: vi.fn(),
    createBillingEvent: vi.fn(),
    createPaymentTransaction: vi.fn()
  }
}));

vi.mock("../src/services/opayClient.js", () => ({
  opayClient: {
    verifyPayment: mocks.opayVerifyPayment,
    verifiedFrom: mocks.opayVerifiedFrom,
    signatureForPayload: vi.fn(),
    createCashierPayment: vi.fn(),
    checkoutUrlFrom: vi.fn(),
    refundPayment: vi.fn()
  }
}));

vi.mock("../src/repositories/userRepository.js", () => ({
  userRepository: {
    findById: mocks.userFindById
  }
}));

vi.mock("../src/config/database.js", () => ({
  withTransaction: vi.fn((callback) => callback({ query: vi.fn() })),
  pool: {}
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("upload content validation", () => {
  it("rejects files whose magic bytes do not match their declared MIME type and removes the file", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "medexplain-upload-"));
    vi.stubEnv("UPLOAD_ROOT", tempDir);
    vi.stubEnv("ALLOWED_UPLOAD_MIME_TYPES", "application/pdf,image/png,image/jpeg,image/webp");
    const filePath = path.join(tempDir, "fake.pdf");
    fs.writeFileSync(filePath, "not a pdf");
    const { validateUploadedFile } = await import("../src/middlewares/upload.js");
    const next = vi.fn();

    await validateUploadedFile({ file: { path: filePath, mimetype: "application/pdf" } }, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ code: "BAD_REQUEST" });
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

describe("production error redaction", () => {
  it("does not expose internal server error details in production responses", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { sendError } = await import("../src/utils/response.js");
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };

    sendError(res, Object.assign(new Error("database password leaked in stack"), { details: { stack: "secret" } }), 500);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred.", details: null }
      })
    );
  });
});

describe("JWT claim enforcement", () => {
  it("rejects access tokens without the required token type claim", async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", "development-access-secret-change-before-production");
    vi.stubEnv("JWT_ISSUER", "medexplain-ai");
    vi.stubEnv("JWT_AUDIENCE", "medexplain-ai-users");
    const { authenticate } = await import("../src/middlewares/auth.js");
    const token = jwt.sign({}, "development-access-secret-change-before-production", {
      subject: "018f0000-0000-7000-8000-000000000101",
      issuer: "medexplain-ai",
      audience: "medexplain-ai-users"
    });
    const req = { get: () => `Bearer ${token}` };
    const next = vi.fn();

    await authenticate(req, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.userFindById).not.toHaveBeenCalled();
  });
});

describe("OPay payment integrity", () => {
  it("blocks payment verification when provider amount differs from the server-side payment record", async () => {
    vi.stubEnv("OPAY_MERCHANT_ID", "merchant");
    const { subscriptionService } = await import("../src/services/subscriptionService.js");
    mocks.billingFindPayment.mockResolvedValue({
      id: "payment-id",
      provider_reference: "MX-test",
      amount_cents: 500000,
      currency: "NGN",
      status: "pending"
    });
    mocks.opayVerifyPayment.mockResolvedValue({ data: { status: "SUCCESS", amount: { total: 100, currency: "NGN" } } });
    mocks.opayVerifiedFrom.mockReturnValue(true);

    await expect(subscriptionService.verifyPayment({ reference: "MX-test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
