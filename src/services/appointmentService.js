import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { errors } from "../utils/errors.js";
import { entitlementService, features } from "./entitlementService.js";
import { doctorMarketplaceService } from "./doctorMarketplaceService.js";

export const appointmentService = {
  async create(user, input) {
    return doctorMarketplaceService.bookAppointment({ user, input, entitlementService, features });
  },

  async list(user) {
    return appointmentRepository.listForUser(user);
  },

  async updateStatus(user, id, status) {
    const result = await doctorMarketplaceService.updateAppointmentStatus({ user, id, status });
    if (!result.appointment) throw errors.notFound("Appointment not found.");
    return result.appointment;
  }
};
