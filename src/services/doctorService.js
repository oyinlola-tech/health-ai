import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { reportRepository } from "../repositories/reportRepository.js";

export const doctorService = {
  appointments(user) {
    return appointmentRepository.listForUser(user);
  },

  reports(user) {
    return reportRepository.listForUser(user);
  }
};
