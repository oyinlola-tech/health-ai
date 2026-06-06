import { entitlementService, features } from "../../services/entitlementService.js";

export function requireEntitlement(feature) {
  return async (req, _res, next) => {
    try {
      const decision = await entitlementService.assertCanUse(req.user, feature);
      req.entitlement = { feature, ...decision };
      return next();
    } catch (error) {
      error.details = {
        ...(error.details || {}),
        feature,
        upgradePath: "/subscription",
        upgradePrompt: "Upgrade your MedExplain AI plan to unlock this feature."
      };
      return next(error);
    }
  };
}

export const entitlementGuard = {
  requireEntitlement,
  requireReportAnalysis: requireEntitlement(features.REPORT_ANALYSIS),
  requireAiChat: requireEntitlement(features.AI_CHAT),
  requireDoctorConsultation: requireEntitlement(features.DOCTOR_CONSULTATION),
  requirePremiumRag: requireEntitlement(features.ADVANCED_AI_EXPLANATIONS)
};

export { features };
