import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config/database.js", () => ({
  pool: {}
}));

vi.mock("../src/modules/email/email.mapper.js", () => ({
  emailMapper: {
    handle: vi.fn()
  }
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: {
    error: vi.fn()
  }
}));

describe("event dispatcher idempotency keys", () => {
  it("builds a bounded key without hashing password-named event types", async () => {
    const { eventKey } = await import("../src/modules/events/event.dispatcher.js");
    const key = eventKey({
      type: "PASSWORD_CHANGED",
      userId: "018f0000-0000-7000-8000-000000000101",
      entityType: "users",
      entityId: "018f0000-0000-7000-8000-000000000101",
      payload: {}
    });

    expect(key).toBe("event:PASSWORD_CHANGED:018f0000-0000-7000-8000-000000000101:entity:users:018f0000-0000-7000-8000-000000000101");
    expect(key.length).toBeLessThanOrEqual(180);
  });

  it("uses an explicit idempotency key when the publisher provides one", async () => {
    const { eventKey } = await import("../src/modules/events/event.dispatcher.js");

    expect(eventKey({ idempotencyKey: "password-reset:user-1", payload: {} })).toBe("password-reset:user-1");
  });
});
