import { notificationService } from "../services/notificationService.js";
import { sendSuccess } from "../utils/response.js";

export const notificationController = {
  async list(req, res) {
    return sendSuccess(res, { notifications: await notificationService.list(req.user) });
  },

  async markRead(req, res) {
    return sendSuccess(res, { notification: await notificationService.markRead(req.user, req.params.id) });
  }
};
