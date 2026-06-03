import { env } from "../../config/env.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";
import { errors } from "../../utils/errors.js";

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.35);
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
  return { promptTokens, responseTokens, tokensUsed, costEstimate };
}

export async function assertBudget({ userId, estimatedCost, endpoint, model }) {
  const [userSpend, globalSpend] = await Promise.all([
    userId ? aiUsageRepository.dailySpendForUser(userId) : Promise.resolve(0),
    aiUsageRepository.dailyGlobalSpend()
  ]);

  if (env.AI_DAILY_USER_BUDGET_CENTS > 0 && userId && userSpend + estimatedCost > env.AI_DAILY_USER_BUDGET_CENTS) {
    await aiUsageRepository.create({
      userId,
      endpoint,
      tokensUsed: 0,
      promptTokens: 0,
      responseTokens: 0,
      costEstimate: 0,
      modelUsed: model,
      blockedReason: "daily_user_budget_exceeded"
    });
    throw errors.forbidden("Your daily AI budget has been reached. Please try again later.");
  }

  if (env.AI_DAILY_GLOBAL_BUDGET_CENTS > 0 && globalSpend + estimatedCost > env.AI_DAILY_GLOBAL_BUDGET_CENTS) {
    await aiUsageRepository.create({
      userId,
      endpoint,
      tokensUsed: 0,
      promptTokens: 0,
      responseTokens: 0,
      costEstimate: 0,
      modelUsed: model,
      blockedReason: "daily_global_budget_exceeded"
    });
    throw errors.forbidden("AI usage is temporarily limited. Please try again later.");
  }
}

export async function recordUsage({ userId, endpoint, model, prompt, response, cacheHit = false, metadata = {} }) {
  const usage = estimateUsage({ prompt, response, model });
  return aiUsageRepository.create({
    userId,
    endpoint,
    tokensUsed: usage.tokensUsed,
    promptTokens: usage.promptTokens,
    responseTokens: usage.responseTokens,
    costEstimate: cacheHit ? 0 : usage.costEstimate,
    modelUsed: model,
    cacheHit,
    metadata
  });
}
