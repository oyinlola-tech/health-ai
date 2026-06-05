import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";
import { billingRepository } from "../../repositories/billingRepository.js";
import { AppError, errors } from "../../utils/errors.js";

const promptInjectionPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(system|developer|previous)\s+instructions/i,
  /reveal\s+(the\s+)?(system|developer|hidden)\s+prompt/i,
  /print\s+(the\s+)?(system|developer|hidden)\s+prompt/i,
  /api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token/i,
  /jailbreak|developer\s+mode|dan\s+mode/i
];

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).split(/\s+/).filter(Boolean).length * 1.35);
}

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function retryAfterMonth() {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(1, Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000));
}

function aiBudgetError(message = "Upgrade required for more AI usage") {
  return new AppError(message, 403, "AI_BUDGET_EXCEEDED", {
    code: "AI_BUDGET_EXCEEDED",
    message,
    retry_after: `${retryAfterMonth()} days`
  });
}

function featureDefaults(featureType) {
  if (featureType === "report_analysis") return env.AI_FEATURE_REPORT_MONTHLY_BUDGET_USD;
  if (featureType === "doctor_assist_request") return env.AI_FEATURE_DOCTOR_ASSIST_MONTHLY_BUDGET_USD;
  return env.AI_FEATURE_CHAT_MONTHLY_BUDGET_USD;
}

function hasPremiumPlan(subscription) {
  return ["premium_monthly", "premium_annual", "PREMIUM_MONTHLY", "PREMIUM_ANNUAL"].includes(subscription?.plan_code);
}

async function quotaForUser(userId) {
  const existing = await aiUsageRepository.currentQuota(userId);
  if (existing) return existing;

  const subscription = await billingRepository.currentSubscription(userId);
  const premium = hasPremiumPlan(subscription);
  return aiUsageRepository.upsertQuota({
    userId,
    planCode: premium ? subscription.plan_code : "FREE",
    monthlyCostLimitUsd: premium ? env.AI_PREMIUM_MONTHLY_BUDGET_USD : env.AI_FREE_MONTHLY_BUDGET_USD,
    monthlyTokenLimit: premium ? null : 50000,
    dailyRequestLimit: premium ? env.AI_PREMIUM_DAILY_REQUEST_LIMIT : env.AI_FREE_DAILY_REQUEST_LIMIT,
    burstPerMinute: env.AI_BURST_PER_MINUTE
  });
}

function safetyFlagsForPrompt(prompt) {
  const flags = [];
  if (prompt.length > env.AI_MAX_PROMPT_CHARS) flags.push("prompt_too_large");
  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(prompt)) flags.push("prompt_injection_signal");
  }
  return [...new Set(flags)];
}

export function costRateForModel(model) {
  if (model === env.GEMINI_PRO_MODEL) return env.AI_PRO_COST_PER_1K_TOKENS_CENTS;
  if (model === env.GEMINI_EMBEDDING_MODEL) return env.AI_EMBEDDING_COST_PER_1K_TOKENS_CENTS;
  return env.AI_FLASH_COST_PER_1K_TOKENS_CENTS;
}

export function estimateUsage({ prompt, response = "", model }) {
  const promptTokens = estimateTokens(prompt);
  const responseTokens = estimateTokens(response);
  const tokensUsed = promptTokens + responseTokens;
  const costEstimate = (tokensUsed / 1000) * costRateForModel(model);
  const costUsd = costEstimate / 100;
  return {
    promptTokens,
    responseTokens,
    inputTokens: promptTokens,
    outputTokens: responseTokens,
    tokensUsed,
    costEstimate,
    costUsd,
    costNgn: env.AI_NGN_PER_USD > 0 ? costUsd * env.AI_NGN_PER_USD : null
  };
}

export function optimizePromptForCost(prompt) {
  const normalized = String(prompt || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= env.AI_MAX_CONTEXT_CHARS) return normalized;

  const keepStart = Math.floor(env.AI_MAX_CONTEXT_CHARS * 0.7);
  const keepEnd = env.AI_MAX_CONTEXT_CHARS - keepStart;
  return [
    normalized.slice(0, keepStart),
    "\n\n[Context compressed by MedExplain AI cost optimizer. Middle section omitted because it exceeded the server-side AI context budget.]\n\n",
    normalized.slice(-keepEnd)
  ].join("");
}

export function inspectPromptSafety(prompt) {
  const flags = safetyFlagsForPrompt(prompt);
  return {
    allowed: !flags.includes("prompt_too_large") && !flags.includes("prompt_injection_signal"),
    flags,
    promptHash: hashText(prompt)
  };
}

async function logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason, safetyFlags = [], metadata = {} }) {
  const usage = estimateUsage({ prompt, model });
  return aiUsageRepository.create({
    userId,
    endpoint,
    featureType,
    requestId,
    tokensUsed: 0,
    promptTokens: usage.promptTokens,
    responseTokens: 0,
    inputTokens: usage.inputTokens,
    outputTokens: 0,
    costEstimate: 0,
    estimatedCost: 0,
    costUsd: 0,
    costNgn: null,
    modelUsed: model,
    blockedReason,
    status: "blocked",
    promptHash: hashText(prompt),
    safetyFlags,
    metadata
  });
}

export async function assertBudget({ userId, estimatedCost, estimatedCostUsd, endpoint, featureType, model, prompt, requestId, safetyFlags = [], metadata = {} }) {
  const systemBudget = await aiUsageRepository.activeBudget("system", "global");
  if (systemBudget?.emergency_throttle) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "emergency_throttle", safetyFlags, metadata });
    throw aiBudgetError("AI usage is temporarily throttled.");
  }

  if (safetyFlags.length) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: safetyFlags.join(","), safetyFlags, metadata });
    throw errors.badRequest("AI request failed safety checks.");
  }

  const [globalMonthlySpend, featureMonthlySpend, featureBudget] = await Promise.all([
    aiUsageRepository.monthlyGlobalSpend(),
    aiUsageRepository.monthlySpendForFeature(featureType),
    aiUsageRepository.activeBudget("feature", featureType)
  ]);

  const systemLimit = Number(systemBudget?.monthly_cost_limit_usd ?? env.AI_MONTHLY_SYSTEM_BUDGET_USD);
  if (systemLimit > 0 && globalMonthlySpend + estimatedCostUsd > systemLimit) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "monthly_global_budget_exceeded", metadata });
    throw aiBudgetError("AI system budget has been reached.");
  }

  const featureLimit = Number(featureBudget?.monthly_cost_limit_usd ?? featureDefaults(featureType));
  if (featureLimit > 0 && featureMonthlySpend + estimatedCostUsd > featureLimit) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "monthly_feature_budget_exceeded", metadata });
    throw aiBudgetError("AI feature budget has been reached.");
  }

  if (!userId) return;

  const quota = await quotaForUser(userId);
  const [monthlyUserSpend, dailyRequests, minuteRequests] = await Promise.all([
    aiUsageRepository.monthlySpendForUser(userId),
    aiUsageRepository.dailyRequestCount(userId),
    aiUsageRepository.requestCountSince({ userId, since: new Date(Date.now() - 60000).toISOString() })
  ]);

  if (env.AI_DAILY_USER_BUDGET_CENTS > 0 && Number(monthlyUserSpend.cost_usd || 0) * 100 + estimatedCost > env.AI_DAILY_USER_BUDGET_CENTS * 31) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "legacy_user_budget_exceeded", metadata });
    throw aiBudgetError();
  }

  if (Number(quota.monthly_cost_limit_usd || 0) > 0 && Number(monthlyUserSpend.cost_usd || 0) + estimatedCostUsd > Number(quota.monthly_cost_limit_usd)) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "monthly_user_budget_exceeded", metadata });
    throw aiBudgetError();
  }

  if (quota.monthly_token_limit && Number(monthlyUserSpend.tokens_used || 0) + estimateUsage({ prompt, model }).tokensUsed > Number(quota.monthly_token_limit)) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "monthly_user_token_cap_exceeded", metadata });
    throw aiBudgetError();
  }

  if (quota.daily_request_limit && dailyRequests >= Number(quota.daily_request_limit)) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "daily_user_request_cap_exceeded", metadata });
    throw aiBudgetError();
  }

  const minuteLimit = Number(quota.burst_per_minute || env.AI_PER_MINUTE_REQUEST_LIMIT);
  if (minuteLimit > 0 && minuteRequests >= minuteLimit) {
    await logBlocked({ userId, endpoint, featureType, model, prompt, requestId, blockedReason: "burst_rate_limit_exceeded", metadata });
    throw new AppError("Too many AI requests. Please pause briefly and try again.", 429, "AI_RATE_LIMITED", { retry_after: "60 seconds" });
  }
}

export async function recordUsage({ userId, endpoint, featureType, model, prompt, response, cacheHit = false, requestId, responseTimeMs = 0, metadata = {}, safetyFlags = [] }) {
  const usage = estimateUsage({ prompt, response, model });
  return aiUsageRepository.create({
    userId,
    endpoint,
    featureType,
    requestId,
    tokensUsed: usage.tokensUsed,
    promptTokens: usage.promptTokens,
    responseTokens: usage.responseTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costEstimate: cacheHit ? 0 : usage.costEstimate,
    estimatedCost: cacheHit ? 0 : usage.costEstimate,
    costUsd: cacheHit ? 0 : usage.costUsd,
    costNgn: cacheHit ? null : usage.costNgn,
    modelUsed: model,
    cacheHit,
    status: cacheHit ? "cached" : "completed",
    responseTimeMs,
    promptHash: hashText(prompt),
    safetyFlags,
    metadata
  });
}

export async function recordFailedUsage({ userId, endpoint, featureType, model, prompt, requestId, responseTimeMs = 0, metadata = {}, error }) {
  const usage = estimateUsage({ prompt, model });
  return aiUsageRepository.create({
    userId,
    endpoint,
    featureType,
    requestId,
    tokensUsed: usage.tokensUsed,
    promptTokens: usage.promptTokens,
    responseTokens: 0,
    inputTokens: usage.inputTokens,
    outputTokens: 0,
    costEstimate: 0,
    estimatedCost: 0,
    costUsd: 0,
    costNgn: null,
    modelUsed: model,
    blockedReason: "provider_or_schema_failure",
    status: "failed",
    responseTimeMs,
    promptHash: hashText(prompt),
    metadata: { ...metadata, errorCode: error?.code || error?.name || "AI_FAILURE" }
  });
}
