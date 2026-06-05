import { doctorMarketplaceService } from "../services/doctorMarketplaceService.js";
import { sendSuccess } from "../utils/response.js";

export const doctorMarketplaceController = {
  async directory(req, res) {
    return sendSuccess(res, { doctors: await doctorMarketplaceService.directory(req.query) });
  },

  async profile(req, res) {
    return sendSuccess(res, { doctor: await doctorMarketplaceService.profile(req.params.id, req.user || null) });
  },

  async verify(req, res) {
    return sendSuccess(res, {
      doctor: await doctorMarketplaceService.setVerification({
        doctorId: req.params.id,
        actor: req.user,
        status: req.body.status,
        notes: req.body.notes
      })
    });
  },

  async updateProfile(req, res) {
    return sendSuccess(res, { profile: await doctorMarketplaceService.updateProfile(req.user, req.body) });
  },

  async availability(req, res) {
    return sendSuccess(res, { availability: await doctorMarketplaceService.addAvailability(req.user, req.body) }, {}, 201);
  },

  async unavailable(req, res) {
    return sendSuccess(res, { unavailableSlot: await doctorMarketplaceService.addUnavailableSlot(req.user, req.body) }, {}, 201);
  },

  async consultations(req, res) {
    return sendSuccess(res, { consultations: await doctorMarketplaceService.consultations(req.user) });
  },

  async messages(req, res) {
    return sendSuccess(res, { messages: await doctorMarketplaceService.messages({ user: req.user, sessionId: req.params.id }) });
  },

  async sendMessage(req, res) {
    return sendSuccess(res, {
      message: await doctorMarketplaceService.sendMessage({ user: req.user, sessionId: req.params.id, content: req.body.content })
    }, {}, 201);
  }
};
