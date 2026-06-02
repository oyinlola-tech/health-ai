import { legalService } from "../services/legalService.js";
import { sendSuccess } from "../utils/response.js";

export const legalController = {
  async policies(_req, res) {
    return sendSuccess(res, { policies: await legalService.policies() });
  },

  async consent(req, res) {
    return sendSuccess(res, { consent: await legalService.consent(req.user, req.body, req) }, {}, 201);
  }
};
