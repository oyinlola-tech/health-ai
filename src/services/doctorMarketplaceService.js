import { withTransaction } from "../config/database.js";
import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { consultationRepository } from "../repositories/consultationRepository.js";
import { doctorRepository } from "../repositories/doctorRepository.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { errors } from "../utils/errors.js";
import { decryptMessage, encryptMessage } from "../utils/messageCrypto.js";
import { socketHub } from "../sockets/hub.js";

function doctorDisplayName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ");
}

export const doctorMarketplaceService = {
  directory(filters) {
    return doctorRepository.directory(filters);
  },

  async profile(id, user = null) {
    const includeUnverified = user?.role === "Admin" || user?.id === id;
    const profile = await doctorRepository.profile(id, { includeUnverified });
    if (!profile) throw errors.notFound("Doctor not found.");
    const availability = await doctorRepository.listAvailability(id);
    return { ...profile, availability };
  },

  async setVerification({ doctorId, actor, status, notes }) {
    const profile = await doctorRepository.profile(doctorId, { includeUnverified: true });
    if (!profile) throw errors.notFound("Doctor not found.");
    const updated = await doctorRepository.setVerification({ doctorId, actorId: actor.id, status, notes });
    await notificationRepository.create({
      userId: doctorId,
      type: "doctor_verification",
      title: "Verification status updated",
      body: `Your doctor verification status is now ${status}.`
    });
    socketHub.toUser(doctorId, "doctor.verification.updated", { status });
    return updated;
  },

  updateProfile(user, input) {
    if (user.role !== "Doctor") throw errors.forbidden("Only doctors can update doctor profile settings.");
    return doctorRepository.updateProfile({ doctorId: user.id, ...input });
  },

  async addAvailability(user, input) {
    if (user.role !== "Doctor") throw errors.forbidden("Only doctors can update availability.");
    const slot = await doctorRepository.upsertAvailability({ doctorId: user.id, ...input });
    socketHub.toDoctors("doctor.availability.updated", { doctorId: user.id });
    return slot;
  },

  async addUnavailableSlot(user, input) {
    if (user.role !== "Doctor") throw errors.forbidden("Only doctors can block availability.");
    const slot = await doctorRepository.addUnavailableSlot({ doctorId: user.id, ...input });
    socketHub.toDoctors("doctor.availability.updated", { doctorId: user.id });
    return slot;
  },

  async bookAppointment({ user, input, entitlementService, features }) {
    if (user.role !== "Patient") throw errors.forbidden("Only patients can book appointments.");
    await entitlementService.assertCanUse(user, features.DOCTOR_CONSULTATION);
    const doctor = await doctorRepository.profile(input.doctorId);
    if (!doctor) throw errors.badRequest("This doctor is not available for consultations.");
    const available = await doctorRepository.isSlotAvailable({ doctorId: input.doctorId, scheduledAt: input.scheduledAt });
    if (!available) throw errors.badRequest("Selected doctor time slot is unavailable.");

    const appointment = await appointmentRepository.create({
      patientId: user.id,
      doctorId: input.doctorId,
      scheduledAt: input.scheduledAt,
      reason: input.reason,
      notes: input.notes
    });
    await notificationRepository.create({
      userId: input.doctorId,
      type: "appointment_booked",
      title: "New appointment request",
      body: `${user.first_name} ${user.last_name} requested a consultation.`
    });
    await notificationRepository.create({
      userId: user.id,
      type: "appointment_booked",
      title: "Appointment requested",
      body: `Your request with Dr. ${doctorDisplayName(doctor)} has been saved.`
    });
    await entitlementService.recordUsage(user, features.DOCTOR_CONSULTATION, { appointmentId: appointment.id });
    socketHub.toUser(input.doctorId, "appointment.booked", { appointment });
    return appointment;
  },

  async updateAppointmentStatus({ user, id, status }) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw errors.notFound("Appointment not found.");
    if (user.role === "Doctor" && appointment.doctor_id !== user.id) throw errors.forbidden("Only the assigned doctor can update this appointment.");
    if (user.role === "Patient" && appointment.patient_id !== user.id) throw errors.forbidden("You can only update your own appointments.");
    if (status === "CONFIRMED" && user.role !== "Doctor") throw errors.forbidden("Only verified doctors can confirm appointments.");
    if (user.role === "Doctor") {
      const doctor = await doctorRepository.profile(user.id);
      if (!doctor) throw errors.forbidden("Only verified doctors can accept appointments.");
    }

    return withTransaction(async (client) => {
      const updated = await appointmentRepository.updateStatus({ id, status, user }, client);
      let session = null;
      if (status === "CONFIRMED") {
        session = await consultationRepository.createForAppointment(updated, client);
      }
      await notificationRepository.create(
        {
          userId: appointment.patient_id,
          type: "appointment_status",
          title: "Appointment status updated",
          body: `Your appointment is now ${status}.`
        },
        client
      );
      socketHub.toUser(appointment.patient_id, "appointment.status.updated", { appointment: updated, session });
      socketHub.toUser(appointment.doctor_id, "appointment.status.updated", { appointment: updated, session });
      return { appointment: updated, session };
    });
  },

  consultations(user) {
    return consultationRepository.listForUser(user);
  },

  async messages({ user, sessionId }) {
    const session = await consultationRepository.findForUser(sessionId, user);
    if (!session) throw errors.notFound("Consultation not found.");
    const rows = await consultationRepository.messages(sessionId);
    return rows.map((row) => ({ ...row, content: decryptMessage(row.encrypted_content) }));
  },

  async sendMessage({ user, sessionId, content }) {
    const session = await consultationRepository.findForUser(sessionId, user);
    if (!session) throw errors.notFound("Consultation not found.");
    const recipientId = user.id === session.patient_id ? session.doctor_id : session.patient_id;
    const message = await consultationRepository.addMessage({
      sessionId,
      senderId: user.id,
      recipientId,
      content,
      encryptedContent: encryptMessage(content)
    });
    await notificationRepository.create({
      userId: recipientId,
      type: "consultation_message",
      title: "New consultation message",
      body: "You have a new message in a consultation room."
    });
    socketHub.toConsultation(sessionId, "consultation.message.created", { message });
    socketHub.toUser(recipientId, "notification.created", { type: "consultation_message" });
    return message;
  }
};
