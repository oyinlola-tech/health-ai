import { aiUsageService } from "../services/aiUsageService.js";
import { sendSuccess } from "../utils/response.js";

export const aiUsageController = {
  async summary(_req, res) {
    return sendSuccess(res, { usage: await aiUsageService.summary() });
  },

  async user(req, res) {
    return sendSuccess(res, { usage: await aiUsageService.userUsage(req.params.id) });
  },

  async me(req, res) {
    return sendSuccess(res, { usage: await aiUsageService.currentUserUsage(req.user) });
  },

  async costs(_req, res) {
    return sendSuccess(res, { costs: await aiUsageService.costs() });
  },

  async dashboard(_req, res) {
    return sendSuccess(res, { dashboard: await aiUsageService.dashboard() });
  }
};
