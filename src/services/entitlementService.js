import { env } from "../config/env.js";
import { billingRepository } from "../repositories/billingRepository.js";
import { errors } from "../utils/errors.js";
import { trialService } from "../modules/promotions/trial.service.js";

export const features = {
  REPORT_ANALYSIS: "REPORT_ANALYSIS",
  AI_CHAT: "AI_CHAT",
  DOCTOR_CONSULTATION: "DOCTOR_CONSULTATION",
  HEALTH_TREND_ANALYTICS: "HEALTH_TREND_ANALYTICS",
  PRIORITY_PROCESSING: "PRIORITY_PROCESSING",
  ADVANCED_AI_EXPLANATIONS: "ADVANCED_AI_EXPLANATIONS"
};

function planFromSubscription(subscription) {
  if (subscription?.plan_code === "PREMIUM_MONTHLY") return "PREMIUM";
  if (subscription?.plan_code === "BASIC_MONTHLY") return "BASIC";
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

async function optionalTrial(userId) {
  try {
    return await trialService.currentTrial(userId);
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
}

async function optionalCouponAccess(userId) {
  if (!billingRepository.activeCouponAccess) return null;
  try {
    return await billingRepository.activeCouponAccess(userId);
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
}

export const entitlementService = {
  async status(user) {
    const [subscription, usage, trial, couponAccess] = await Promise.all([
      billingRepository.currentSubscription(user.id),
      billingRepository.usageForUser(user.id),
      optionalTrial(user.id),
      optionalCouponAccess(user.id)
    ]);
    const trialActive = trialService.isActive(trial);
    const plan = subscription ? planFromSubscription(subscription) : trialActive ? "FREE_TRIAL" : "FREE";
    const premiumLike = plan === "PREMIUM" || (trialActive && env.FREE_TRIAL_FULL_ACCESS);
    const usageByFeature = Object.fromEntries(usage.map((row) => [row.feature, row]));

    return {
      plan,
      subscription,
      trial: trial
        ? {
            status: trial.status,
            startDate: trial.start_date,
            endDate: trial.end_date,
            daysRemaining: trialService.daysRemaining(trial),
            fullAccess: Boolean(env.FREE_TRIAL_FULL_ACCESS)
          }
        : null,
      couponAccess: Boolean(couponAccess),
      usage: {
        reportAnalysis: {
          used: usageByFeature[features.REPORT_ANALYSIS]?.used_count || 0,
          limit: premiumLike ? null : subscription?.report_analysis_limit ?? env.FREE_REPORT_ANALYSIS_LIMIT
        },
        aiChat: {
          used: usageByFeature[features.AI_CHAT]?.used_count || 0,
          limit: premiumLike ? null : subscription?.ai_chat_limit ?? env.FREE_AI_CHAT_LIMIT
        },
        doctorBookings: {
          used: usageByFeature[features.DOCTOR_CONSULTATION]?.used_count || 0,
          limit: premiumLike || subscription?.doctor_consultations_enabled ? null : 0
        }
      }
    };
  },

  async assertCanUse(user, feature) {
    if (user.role !== "Patient") return { allowed: true, plan: "STAFF" };
    const status = await this.status(user);
    if (status.plan === "PREMIUM" || (status.plan === "FREE_TRIAL" && status.trial?.fullAccess)) return { allowed: true, plan: status.plan };
    if (status.plan === "BASIC") {
      const enabledMap = {
        [features.REPORT_ANALYSIS]: true,
        [features.AI_CHAT]: true,
        [features.HEALTH_TREND_ANALYTICS]: true,
        [features.PRIORITY_PROCESSING]: false,
        [features.DOCTOR_CONSULTATION]: false,
        [features.ADVANCED_AI_EXPLANATIONS]: false
      };
      if (!enabledMap[feature]) throw entitlementError(feature);
      const usageMap = {
        [features.REPORT_ANALYSIS]: status.usage.reportAnalysis.used,
        [features.AI_CHAT]: status.usage.aiChat.used,
        [features.DOCTOR_CONSULTATION]: status.usage.doctorBookings.used
      };
      const limitMap = {
        [features.REPORT_ANALYSIS]: status.usage.reportAnalysis.limit,
        [features.AI_CHAT]: status.usage.aiChat.limit,
        [features.DOCTOR_CONSULTATION]: status.usage.doctorBookings.limit
      };
      const limit = limitMap[feature];
      if (limit === null || limit === undefined || (usageMap[feature] || 0) < limit) return { allowed: true, plan: "BASIC" };
      throw entitlementError(feature);
    }

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
