import { entitlementService, features } from "../services/entitlementService.js";

function requireFeature(feature) {
  return async (req, _res, next) => {
    try {
      await entitlementService.assertCanUse(req.user, feature);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const requirePremium = requireFeature(features.ADVANCED_AI_EXPLANATIONS);
export const requireDoctorAccess = requireFeature(features.DOCTOR_CONSULTATION);
export const requireUnlimitedAnalysis = requireFeature(features.REPORT_ANALYSIS);
