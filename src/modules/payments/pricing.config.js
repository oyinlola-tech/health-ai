import { env } from "../../config/env.js";
import { features } from "../../services/entitlementService.js";

export const planCodes = {
  FREE: "FREE",
  BASIC: "BASIC_MONTHLY",
  PREMIUM: "PREMIUM_MONTHLY"
};

export const pricingPlans = [
  {
    code: planCodes.FREE,
    tier: "FREE",
    name: "Free",
    interval: "month",
    priceNaira: 0,
    currency: "NGN",
    reportAnalysisLimit: env.FREE_REPORT_ANALYSIS_LIMIT,
    aiChatLimit: env.FREE_AI_CHAT_LIMIT,
    doctorConsultationsEnabled: false,
    healthTrendsEnabled: false,
    priorityProcessingEnabled: false,
    advancedAiEnabled: false,
    features: ["3 AI report analyses/month", "Basic RAG responses"]
  },
  {
    code: planCodes.BASIC,
    tier: "BASIC",
    name: "Basic",
    interval: "month",
    priceNaira: env.BASIC_MONTHLY_PRICE_NAIRA,
    currency: "NGN",
    reportAnalysisLimit: 20,
    aiChatLimit: 100,
    doctorConsultationsEnabled: false,
    healthTrendsEnabled: true,
    priorityProcessingEnabled: false,
    advancedAiEnabled: false,
    features: ["20 AI analyses/month", "Basic and limited RAG responses", "Limited doctor access directory"]
  },
  {
    code: planCodes.PREMIUM,
    tier: "PREMIUM",
    name: "Premium",
    interval: "month",
    priceNaira: env.PREMIUM_MONTHLY_PRICE_NAIRA,
    currency: "NGN",
    reportAnalysisLimit: null,
    aiChatLimit: null,
    doctorConsultationsEnabled: true,
    healthTrendsEnabled: true,
    priorityProcessingEnabled: true,
    advancedAiEnabled: true,
    features: ["Unlimited AI analyses", "Premium RAG insights", "Full doctor consultation access", "Priority processing"]
  }
];

export const entitlementPolicy = {
  [planCodes.FREE]: {
    [features.REPORT_ANALYSIS]: { enabled: true, limit: env.FREE_REPORT_ANALYSIS_LIMIT },
    [features.AI_CHAT]: { enabled: true, limit: env.FREE_AI_CHAT_LIMIT },
    [features.DOCTOR_CONSULTATION]: { enabled: false, limit: 0 },
    [features.HEALTH_TREND_ANALYTICS]: { enabled: false, limit: 0 },
    [features.PRIORITY_PROCESSING]: { enabled: false, limit: 0 },
    [features.ADVANCED_AI_EXPLANATIONS]: { enabled: false, limit: 0 }
  },
  [planCodes.BASIC]: {
    [features.REPORT_ANALYSIS]: { enabled: true, limit: 20 },
    [features.AI_CHAT]: { enabled: true, limit: 100 },
    [features.DOCTOR_CONSULTATION]: { enabled: false, limit: 0 },
    [features.HEALTH_TREND_ANALYTICS]: { enabled: true, limit: null },
    [features.PRIORITY_PROCESSING]: { enabled: false, limit: 0 },
    [features.ADVANCED_AI_EXPLANATIONS]: { enabled: false, limit: 0 }
  },
  [planCodes.PREMIUM]: {
    [features.REPORT_ANALYSIS]: { enabled: true, limit: null },
    [features.AI_CHAT]: { enabled: true, limit: null },
    [features.DOCTOR_CONSULTATION]: { enabled: true, limit: null },
    [features.HEALTH_TREND_ANALYTICS]: { enabled: true, limit: null },
    [features.PRIORITY_PROCESSING]: { enabled: true, limit: null },
    [features.ADVANCED_AI_EXPLANATIONS]: { enabled: true, limit: null }
  }
};

export function planTierForCode(code) {
  return pricingPlans.find((plan) => plan.code === code)?.tier || "FREE";
}
