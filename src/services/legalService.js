import { legalRepository } from "../repositories/legalRepository.js";

export const legalService = {
  policies() {
    return legalRepository.listPolicies();
  },

  consent(user, input, req) {
    return legalRepository.recordConsent({
      userId: user.id,
      policySlug: input.policySlug,
      policyVersion: input.policyVersion,
      accepted: input.accepted,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || null
    });
  }
};
