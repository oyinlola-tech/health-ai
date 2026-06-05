import { authService } from "../services/authService.js";
import { adminService } from "../services/adminService.js";
import { sendSuccess } from "../utils/response.js";

export const adminController = {
  async users(req, res) {
    return sendSuccess(res, { users: await adminService.users(req.query) });
  },

  async createDoctor(req, res) {
    return sendSuccess(res, await authService.createDoctor(req.body, req.user), {}, 201);
  },

  async analytics(_req, res) {
    return sendSuccess(res, { analytics: await adminService.analytics() });
  },

  async auditLogs(req, res) {
    return sendSuccess(res, { auditLogs: await adminService.auditLogs(req.query) });
  },

  async reportProcessingMetrics(_req, res) {
    return sendSuccess(res, { metrics: await adminService.reportProcessingMetrics() });
  }
};
