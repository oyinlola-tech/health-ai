import { aiUsageRepository } from "../repositories/aiUsageRepository.js";

export const aiUsageService = {
  summary() {
    return aiUsageRepository.summary();
  },

  userUsage(userId) {
    return aiUsageRepository.userUsage(userId);
  },

  costs() {
    return aiUsageRepository.costs();
  }
};
