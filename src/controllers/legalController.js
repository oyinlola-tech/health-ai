import { legalService } from "../services/legalService.js";
import { sendSuccess } from "../utils/response.js";

export const legalController = {
  async policies(_req, res) {
    return sendSuccess(res, { policies: await legalService.policies() });
  },

  async consent(req, res) {
    return sendSuccess(res, { consent: await legalService.consent(req.user, req.body, req) }, {}, 201);
  },

  async consentStatus(req, res) {
    return sendSuccess(res, { consents: await legalService.status(req.user) });
  },

  async setConsent(req, res) {
    return sendSuccess(res, { consent: await legalService.setOperationalConsent(req.user, req.body, req) }, {}, 201);
  },

  async consentHistory(req, res) {
    return sendSuccess(res, { history: await legalService.history(req.user) });
  }
};
