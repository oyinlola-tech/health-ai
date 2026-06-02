import { appointmentService } from "../services/appointmentService.js";
import { sendSuccess } from "../utils/response.js";

export const appointmentController = {
  async create(req, res) {
    return sendSuccess(res, { appointment: await appointmentService.create(req.user, req.body) }, {}, 201);
  },

  async list(req, res) {
    return sendSuccess(res, { appointments: await appointmentService.list(req.user) });
  },

  async updateStatus(req, res) {
    return sendSuccess(res, { appointment: await appointmentService.updateStatus(req.user, req.params.id, req.body.status) });
  }
};
