import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  findAppointmentAccess: vi.fn(),
  findChatSessionAccess: vi.fn(),
  findConsultationAccess: vi.fn(),
  recordPresence: vi.fn(),
  upsertDeliveryStatus: vi.fn(),
  findSessionForUser: vi.fn(),
  addMessage: vi.fn(),
  markRead: vi.fn(),
  loggerWarn: vi.fn()
}));

vi.mock("../src/repositories/userRepository.js", () => ({
  userRepository: {
    findById: mocks.findUserById
  }
}));

vi.mock("../src/repositories/realtimeRepository.js", () => ({
  realtimeRepository: {
    findAppointmentAccess: mocks.findAppointmentAccess,
    findChatSessionAccess: mocks.findChatSessionAccess,
    findConsultationAccess: mocks.findConsultationAccess,
    recordPresence: mocks.recordPresence,
    upsertDeliveryStatus: mocks.upsertDeliveryStatus
  }
}));

vi.mock("../src/repositories/consultationRepository.js", () => ({
  consultationRepository: {
    findForUser: mocks.findSessionForUser,
    addMessage: mocks.addMessage,
    markRead: mocks.markRead
  }
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: {
    warn: mocks.loggerWarn,
    info: vi.fn(),
    error: vi.fn()
  }
}));

const user = { id: "018f0000-0000-7000-8000-000000000101", role: "Patient", email: "p@example.com" };
const sessionId = "018f0000-0000-7000-8000-000000000303";
const doctorId = "018f0000-0000-7000-8000-000000000202";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("JWT_ACCESS_SECRET", "development-access-secret-change-before-production");
  vi.stubEnv("JWT_ISSUER", "medexplain-ai");
  vi.stubEnv("JWT_AUDIENCE", "medexplain-ai-users");
  vi.stubEnv("MESSAGE_ENCRYPTION_SECRET", "test-message-secret-for-realtime-system");
  mocks.findUserById.mockResolvedValue(user);
  mocks.recordPresence.mockResolvedValue({});
  mocks.upsertDeliveryStatus.mockResolvedValue({});
});

describe("authSocketMiddleware", () => {
  it("authenticates socket connections with JWT access tokens", async () => {
    const { authSocketMiddleware } = await import("../src/realtime/authSocketMiddleware.js");
    const token = jwt.sign(
      { role: user.role, email: user.email, typ: "access" },
      "development-access-secret-change-before-production",
      { subject: user.id, issuer: "medexplain-ai", audience: "medexplain-ai-users", algorithm: "HS256" }
    );
    const socket = { handshake: { auth: { token } }, id: "socket-id" };
    const next = vi.fn();

    await authSocketMiddleware()(socket, next);

    expect(socket.user.id).toBe(user.id);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects unauthorized socket connections", async () => {
    const { authSocketMiddleware } = await import("../src/realtime/authSocketMiddleware.js");
    const socket = { handshake: { auth: {} }, id: "socket-id" };
    const next = vi.fn();

    await authSocketMiddleware()(socket, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});

describe("roomManager", () => {
  it("prevents appointment room hijacking", async () => {
    const { roomManager } = await import("../src/realtime/roomManager.js");
    mocks.findAppointmentAccess.mockResolvedValue(null);
    const socket = { user, join: vi.fn() };

    await expect(roomManager.joinAppointment(socket, "018f0000-0000-7000-8000-000000000404")).rejects.toThrow("Appointment room access denied.");
    expect(socket.join).not.toHaveBeenCalled();
  });
});

describe("eventHandler chat delivery", () => {
  it("persists and broadcasts message_send events", async () => {
    const { registerEventHandlers } = await import("../src/realtime/eventHandler.js");
    const handlers = {};
    const socket = {
      user,
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      to: vi.fn()
    };
    const emit = vi.fn();
    const io = {
      to: vi.fn(() => ({ emit }))
    };
    mocks.findSessionForUser.mockResolvedValue({ id: sessionId, patient_id: user.id, doctor_id: doctorId });
    mocks.addMessage.mockResolvedValue({ id: "018f0000-0000-7000-8000-000000000505", content: "Hello", created_at: "2026-06-05T12:00:00.000Z" });

    registerEventHandlers(io, socket);
    const ack = vi.fn();
    await handlers.message_send({ sessionId, content: "Hello" }, ack);

    expect(mocks.addMessage).toHaveBeenCalledWith(expect.objectContaining({ senderId: user.id, recipientId: doctorId }));
    expect(io.to).toHaveBeenCalledWith(`chat:${sessionId}`);
    expect(emit).toHaveBeenCalledWith("message_receive", expect.objectContaining({ receiverId: doctorId }));
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});

describe("presenceManager load simulation", () => {
  it("tracks many concurrent online users in memory and logs presence", async () => {
    const { presenceManager } = await import("../src/realtime/presenceManager.js");
    const users = Array.from({ length: 50 }, (_, index) => ({ id: `user-${index}`, role: index % 2 ? "Doctor" : "Patient" }));

    await Promise.all(users.map((item, index) => presenceManager.markConnected(item, `socket-${index}`)));

    expect(presenceManager.snapshot().usersOnline).toBeGreaterThanOrEqual(50);
    expect(mocks.recordPresence).toHaveBeenCalledTimes(50);
  });
});
