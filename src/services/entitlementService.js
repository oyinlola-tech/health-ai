import { env } from "../config/env.js";
import { billingRepository } from "../repositories/billingRepository.js";
import { errors } from "../utils/errors.js";

export const features = {
  REPORT_ANALYSIS: "REPORT_ANALYSIS",
  AI_CHAT: "AI_CHAT",
  DOCTOR_CONSULTATION: "DOCTOR_CONSULTATION",
  HEALTH_TREND_ANALYTICS: "HEALTH_TREND_ANALYTICS",
  PRIORITY_PROCESSING: "PRIORITY_PROCESSING",
  ADVANCED_AI_EXPLANATIONS: "ADVANCED_AI_EXPLANATIONS"
};

function planFromSubscription(subscription) {
  if (subscription?.plan_code?.startsWith("PREMIUM")) return "PREMIUM";
  return "FREE";
}

function freeLimitFor(feature) {
  if (feature === features.REPORT_ANALYSIS) return env.FREE_REPORT_ANALYSIS_LIMIT;
  if (feature === features.AI_CHAT) return env.FREE_AI_CHAT_LIMIT;
  return 0;
}

function entitlementError(feature) {
  return Object.assign(errors.forbidden("Your current plan does not include this feature."), {
    code: "PLAN_LIMIT_REACHED",
    details: { code: "PLAN_LIMIT_REACHED", feature }
  });
}

export const entitlementService = {
  async status(user) {
    const subscription = await billingRepository.currentSubscription(user.id);
    const usage = await billingRepository.usageForUser(user.id);
    const plan = planFromSubscription(subscription);
    const usageByFeature = Object.fromEntries(usage.map((row) => [row.feature, row]));

    return {
      plan,
      subscription,
      usage: {
        reportAnalysis: {
          used: usageByFeature[features.REPORT_ANALYSIS]?.used_count || 0,
          limit: plan === "PREMIUM" ? null : env.FREE_REPORT_ANALYSIS_LIMIT
        },
        aiChat: {
          used: usageByFeature[features.AI_CHAT]?.used_count || 0,
          limit: plan === "PREMIUM" ? null : env.FREE_AI_CHAT_LIMIT
        },
        doctorBookings: {
          used: usageByFeature[features.DOCTOR_CONSULTATION]?.used_count || 0,
          limit: plan === "PREMIUM" ? null : 0
        }
      }
    };
  },

  async assertCanUse(user, feature) {
    if (user.role !== "Patient") return { allowed: true, plan: "STAFF" };
    const status = await this.status(user);
    if (status.plan === "PREMIUM") return { allowed: true, plan: "PREMIUM" };

    const limit = freeLimitFor(feature);
    const usageMap = {
      [features.REPORT_ANALYSIS]: status.usage.reportAnalysis.used,
      [features.AI_CHAT]: status.usage.aiChat.used,
      [features.DOCTOR_CONSULTATION]: status.usage.doctorBookings.used
    };
    if (limit > 0 && (usageMap[feature] || 0) < limit) return { allowed: true, plan: "FREE", remaining: limit - (usageMap[feature] || 0) };
    throw entitlementError(feature);
  },

  async recordUsage(user, feature, metadata = {}) {
    if (user.role !== "Patient") return null;
    return billingRepository.incrementUsage({ userId: user.id, feature, metadata });
  }
};
