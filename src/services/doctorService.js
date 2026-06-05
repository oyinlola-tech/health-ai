import { appointmentRepository } from "../repositories/appointmentRepository.js";
import { reportRepository } from "../repositories/reportRepository.js";
import { consentTypes, legalService } from "./legalService.js";

export const doctorService = {
  appointments(user) {
    return appointmentRepository.listForUser(user);
  },

  async reports(user) {
    const reports = await reportRepository.listForDoctorPatients(user.id);
    const filtered = [];
    for (const report of reports) {
      try {
        await legalService.requireConsent(report.patient_id, consentTypes.DOCTOR_SHARING);
        filtered.push(report);
      } catch {
        // Consent revocation immediately removes doctor access to that patient's reports.
      }
    }
    return filtered;
  }
};
