import { entitlementGuard } from "../modules/payments/entitlement.guard.js";

export const requirePremium = entitlementGuard.requirePremiumRag;
export const requireDoctorAccess = entitlementGuard.requireDoctorConsultation;
export const requireUnlimitedAnalysis = entitlementGuard.requireReportAnalysis;
