import { publicConfig } from "../config/env.js";
import { sendSuccess } from "../utils/response.js";

export const configController = {
  public(_req, res) {
    return sendSuccess(res, publicConfig);
  },

  health(_req, res) {
    return sendSuccess(res, {
      status: "ok",
      service: "MedExplain AI",
      timestamp: new Date().toISOString()
    });
  }
};
