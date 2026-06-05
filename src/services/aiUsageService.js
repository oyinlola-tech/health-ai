import { aiUsageRepository } from "../repositories/aiUsageRepository.js";

export const aiUsageService = {
  summary() {
    return aiUsageRepository.summary();
  },

  userUsage(userId) {
    return aiUsageRepository.userUsage(userId);
  },

  async currentUserUsage(user) {
    const [usage, quota] = await Promise.all([aiUsageRepository.monthlySpendForUser(user.id), aiUsageRepository.currentQuota(user.id)]);
    const monthlyCostLimitUsd = Number(quota?.monthly_cost_limit_usd || 0);
    return {
      userId: user.id,
      quota: quota
        ? {
            planCode: quota.plan_code,
            monthlyCostLimitUsd,
            monthlyTokenLimit: quota.monthly_token_limit,
            dailyRequestLimit: quota.daily_request_limit,
            burstPerMinute: quota.burst_per_minute,
            periodStart: quota.period_start,
            periodEnd: quota.period_end
          }
        : null,
      usage: {
        monthlyCostUsd: Number(usage.cost_usd || 0),
        monthlyTokens: Number(usage.tokens_used || 0),
        monthlyRequests: Number(usage.requests || 0),
        quotaPercent: monthlyCostLimitUsd > 0 ? Math.min(100, Math.round((Number(usage.cost_usd || 0) / monthlyCostLimitUsd) * 100)) : 0
      },
      features: await aiUsageRepository.userUsage(user.id)
    };
  },

  costs() {
    return aiUsageRepository.costs();
  },

  dashboard() {
    return aiUsageRepository.dashboard();
  }
};
