import { doctorService } from "../services/doctorService.js";
import { sendSuccess } from "../utils/response.js";

export const doctorController = {
  async appointments(req, res) {
    return sendSuccess(res, { appointments: await doctorService.appointments(req.user) });
  },

  async reports(req, res) {
    return sendSuccess(res, { reports: await doctorService.reports(req.user) });
  }
};
