import { medicalKnowledgeRepository } from "../repositories/medicalKnowledgeRepository.js";
import { sendSuccess } from "../utils/response.js";

export const medicalKnowledgeController = {
  async overview(req, res) {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
    return sendSuccess(res, await medicalKnowledgeRepository.overview(limit));
  }
};
