import { healthService } from "../services/healthService.js";
import { sendSuccess } from "../utils/response.js";

export const healthController = {
  async create(req, res) {
    return sendSuccess(res, { entry: await healthService.create(req.user, req.body) }, {}, 201);
  },

  async list(req, res) {
    return sendSuccess(res, { entries: await healthService.list(req.user) });
  }
};
