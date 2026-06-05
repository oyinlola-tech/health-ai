import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentSubscription: vi.fn(),
  usageForUser: vi.fn(),
  incrementUsage: vi.fn()
}));

vi.mock("../src/repositories/billingRepository.js", () => ({
  billingRepository: {
    currentSubscription: mocks.currentSubscription,
    usageForUser: mocks.usageForUser,
    incrementUsage: mocks.incrementUsage
  }
}));

const user = { id: "018f0000-0000-7000-8000-000000000100", role: "Patient" };

async function loadService() {
  vi.stubEnv("FREE_REPORT_ANALYSIS_LIMIT", "3");
  vi.stubEnv("FREE_AI_CHAT_LIMIT", "10");
  const { entitlementService, features } = await import("../src/services/entitlementService.js");
  return { entitlementService, features };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.currentSubscription.mockResolvedValue(null);
  mocks.usageForUser.mockResolvedValue([]);
  mocks.incrementUsage.mockResolvedValue({ used_count: 1 });
});

describe("entitlementService", () => {
  it("allows free users while under monthly limits", async () => {
    const { entitlementService, features } = await loadService();

    await expect(entitlementService.assertCanUse(user, features.REPORT_ANALYSIS)).resolves.toMatchObject({ plan: "FREE" });
  });

  it("blocks free users after report analysis credits are exhausted", async () => {
    const { entitlementService, features } = await loadService();
    mocks.usageForUser.mockResolvedValue([{ feature: features.REPORT_ANALYSIS, used_count: 3 }]);

    await expect(entitlementService.assertCanUse(user, features.REPORT_ANALYSIS)).rejects.toMatchObject({
      code: "PLAN_LIMIT_REACHED",
      details: { feature: features.REPORT_ANALYSIS }
    });
  });

  it("allows premium users unlimited access", async () => {
    const { entitlementService, features } = await loadService();
    mocks.currentSubscription.mockResolvedValue({ plan_code: "PREMIUM_MONTHLY" });
    mocks.usageForUser.mockResolvedValue([{ feature: features.AI_CHAT, used_count: 99 }]);

    await expect(entitlementService.assertCanUse(user, features.AI_CHAT)).resolves.toMatchObject({ plan: "PREMIUM" });
  });
});
