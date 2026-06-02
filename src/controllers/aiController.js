import { aiService } from "../services/aiService.js";
import { sendSuccess } from "../utils/response.js";

export const aiController = {
  async chat(req, res) {
    return sendSuccess(res, await aiService.chat({ user: req.user, ...req.body }));
  },

  async history(req, res) {
    return sendSuccess(res, { messages: await aiService.history(req.user) });
  },

  async feedback(req, res) {
    return sendSuccess(res, { interaction: await aiService.feedback({ user: req.user, ...req.body }) });
  }
};
