import { medicalKnowledgeRepository } from "../repositories/medicalKnowledgeRepository.js";
import { sendSuccess } from "../utils/response.js";

export const medicalKnowledgeController = {
  async overview(req, res) {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
    return sendSuccess(res, await medicalKnowledgeRepository.overview(limit));
  },

  async search(req, res) {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 12));
    return sendSuccess(res, {
      query: String(req.query.q || "").trim(),
      results: await medicalKnowledgeRepository.search(req.query.q, limit)
    });
  }
};
