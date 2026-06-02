import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { errors } from "../utils/errors.js";

export const appointmentService = {
  async create(user, input) {
    if (user.role !== "Patient") throw errors.forbidden("Only patients can book appointments.");
    const appointment = await appointmentRepository.create({
      patientId: user.id,
      doctorId: input.doctorId,
      scheduledAt: input.scheduledAt,
      reason: input.reason,
      notes: input.notes
    });
    await notificationRepository.create({
      userId: user.id,
      type: "appointment",
      title: "Appointment requested",
      body: "Your appointment request has been saved."
    });
    return appointment;
  },

  async list(user) {
    return appointmentRepository.listForUser(user);
  },

  async updateStatus(user, id, status) {
    const appointment = await appointmentRepository.updateStatus({ id, status, user });
    if (!appointment) throw errors.notFound("Appointment not found.");
    return appointment;
  }
};
