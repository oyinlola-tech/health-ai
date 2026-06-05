import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  directory: vi.fn(),
  profile: vi.fn(),
  listAvailability: vi.fn(),
  isSlotAvailable: vi.fn(),
  upsertAvailability: vi.fn(),
  appointmentCreate: vi.fn(),
  appointmentFindById: vi.fn(),
  appointmentUpdateStatus: vi.fn(),
  createForAppointment: vi.fn(),
  findSessionForUser: vi.fn(),
  addMessage: vi.fn(),
  messages: vi.fn(),
  createNotification: vi.fn(),
  assertCanUse: vi.fn(),
  recordUsage: vi.fn(),
  tx: vi.fn((callback) => callback({ query: vi.fn() })),
  socketToUser: vi.fn(),
  socketToConsultation: vi.fn(),
  socketToDoctors: vi.fn(),
  socketToAppointment: vi.fn(),
  socketToAdmins: vi.fn()
}));

vi.mock("../src/config/database.js", () => ({
  withTransaction: mocks.tx,
  pool: {}
}));

vi.mock("../src/repositories/doctorRepository.js", () => ({
  doctorRepository: {
    directory: mocks.directory,
    profile: mocks.profile,
    listAvailability: mocks.listAvailability,
    isSlotAvailable: mocks.isSlotAvailable,
    upsertAvailability: mocks.upsertAvailability
  }
}));

vi.mock("../src/repositories/appointmentRepository.js", () => ({
  appointmentRepository: {
    create: mocks.appointmentCreate,
    findById: mocks.appointmentFindById,
    updateStatus: mocks.appointmentUpdateStatus
  }
}));

vi.mock("../src/repositories/consultationRepository.js", () => ({
  consultationRepository: {
    createForAppointment: mocks.createForAppointment,
    findForUser: mocks.findSessionForUser,
    addMessage: mocks.addMessage,
    messages: mocks.messages
  }
}));

vi.mock("../src/repositories/notificationRepository.js", () => ({
  notificationRepository: {
    create: mocks.createNotification
  }
}));

vi.mock("../src/sockets/hub.js", () => ({
  socketHub: {
    toUser: mocks.socketToUser,
    toConsultation: mocks.socketToConsultation,
    toDoctors: mocks.socketToDoctors,
    toAppointment: mocks.socketToAppointment,
    toAdmins: mocks.socketToAdmins
  }
}));

const patient = { id: "018f0000-0000-7000-8000-000000000101", role: "Patient", first_name: "Pat", last_name: "Lee" };
const doctor = { id: "018f0000-0000-7000-8000-000000000202", role: "Doctor", first_name: "Doc", last_name: "Ray" };

async function loadService() {
  vi.stubEnv("MESSAGE_ENCRYPTION_SECRET", "test-message-secret-for-doctor-marketplace");
  const { doctorMarketplaceService } = await import("../src/services/doctorMarketplaceService.js");
  return doctorMarketplaceService;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.profile.mockResolvedValue({ id: doctor.id, first_name: "Doc", last_name: "Ray", verification_status: "VERIFIED" });
  mocks.isSlotAvailable.mockResolvedValue(true);
  mocks.appointmentCreate.mockResolvedValue({ id: "appointment-id", patient_id: patient.id, doctor_id: doctor.id, scheduled_at: "2026-06-10T10:00:00.000Z" });
  mocks.createNotification.mockResolvedValue({});
  mocks.assertCanUse.mockResolvedValue({ allowed: true });
  mocks.recordUsage.mockResolvedValue({});
});

describe("doctorMarketplaceService appointments", () => {
  it("blocks booking unavailable doctor slots", async () => {
    const service = await loadService();
    mocks.isSlotAvailable.mockResolvedValue(false);

    await expect(
      service.bookAppointment({
        user: patient,
        input: { doctorId: doctor.id, scheduledAt: "2026-06-10T10:00:00.000Z", reason: "Follow up" },
        entitlementService: { assertCanUse: mocks.assertCanUse, recordUsage: mocks.recordUsage },
        features: { DOCTOR_CONSULTATION: "DOCTOR_CONSULTATION" }
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.appointmentCreate).not.toHaveBeenCalled();
  });

  it("creates a consultation room when a verified assigned doctor confirms", async () => {
    const service = await loadService();
    const appointment = { id: "appointment-id", patient_id: patient.id, doctor_id: doctor.id, scheduled_at: "2026-06-10T10:00:00.000Z" };
    mocks.appointmentFindById.mockResolvedValue(appointment);
    mocks.appointmentUpdateStatus.mockResolvedValue({ ...appointment, status: "CONFIRMED" });
    mocks.createForAppointment.mockResolvedValue({ id: "session-id", appointment_id: appointment.id });

    const result = await service.updateAppointmentStatus({ user: doctor, id: appointment.id, status: "CONFIRMED" });

    expect(result.session.id).toBe("session-id");
    expect(mocks.createForAppointment).toHaveBeenCalledWith(expect.objectContaining({ id: appointment.id }), expect.anything());
  });
});

describe("doctorMarketplaceService consultation messages", () => {
  it("encrypts messages before repository persistence and emits realtime events", async () => {
    const service = await loadService();
    mocks.findSessionForUser.mockResolvedValue({ id: "session-id", patient_id: patient.id, doctor_id: doctor.id });
    mocks.addMessage.mockImplementation((input) => Promise.resolve({ id: "message-id", ...input }));

    const message = await service.sendMessage({ user: patient, sessionId: "session-id", content: "Hello doctor" });

    expect(message.content).toBe("Hello doctor");
    expect(mocks.addMessage).toHaveBeenCalledWith(expect.objectContaining({ encryptedContent: expect.objectContaining({ ciphertext: expect.any(String) }) }));
    expect(mocks.socketToConsultation).toHaveBeenCalledWith("session-id", "message_receive", expect.any(Object));
  });
});
