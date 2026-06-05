import { publicConfig } from "../config/env.js";
import { getHealthStatus } from "../services/healthCheckService.js";
import { sendSuccess } from "../utils/response.js";

export const configController = {
  public(_req, res) {
    return sendSuccess(res, publicConfig);
  },

  async health(_req, res) {
    const health = await getHealthStatus();
    return res.status(health.status === "healthy" ? 200 : 503).json(health);
  }
};
