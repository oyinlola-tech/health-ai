import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";
import { AppError, errors } from "../../utils/errors.js";
import { createId } from "../../utils/uuid.js";
import { aiResponseCache, createCacheKey } from "../cache/lruCache.js";
import { assertBudget, estimateUsage, inspectPromptSafety, optimizePromptForCost, recordFailedUsage, recordUsage } from "../monitor/usageTracker.js";

const jsonGenerationConfig = {
  responseMimeType: "application/json"
};

function selectModel(taskType) {
  if (taskType === "medical_report") return env.GEMINI_REPORT_MODEL || env.GEMINI_PRO_MODEL;
  if (taskType === "doctor_assist") return env.GEMINI_REPORT_MODEL || env.GEMINI_PRO_MODEL;
  if (taskType === "realtime_chat" || taskType === "voice") return env.GEMINI_LIVE_MODEL;
  if (taskType === "tts") return env.GEMINI_TTS_MODEL;
  if (taskType === "fallback") return env.GEMINI_FALLBACK_MODEL;
  if (taskType === "summary") return env.GEMINI_FLASH_MODEL;
  return env.GEMINI_FLASH_MODEL;
}

function modelFor(taskType) {
  if (!env.GEMINI_API_KEY) throw errors.config("GEMINI_API_KEY is required for AI operations.");
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: selectModel(taskType), generationConfig: jsonGenerationConfig });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProviderUnavailable(error) {
  const message = String(error?.message || "");
  return /fetch failed|network|econn|socket|timeout|temporarily unavailable|service unavailable/i.test(message) || error?.status === 503 || error?.statusCode === 503;
}

function providerError(error) {
  if (error instanceof AppError) return error;
  if (isProviderUnavailable(error)) {
    return new AppError("The AI provider is currently unreachable. Please try again in a moment.", 503, "AI_PROVIDER_UNAVAILABLE", {
      provider: "google_gemini"
    });
  }
  return error;
}

async function generateContentWithRetry(taskType, prompt) {
  let lastError;
  for (let attempt = 0; attempt <= env.AI_CALL_RETRIES; attempt += 1) {
    try {
      return await modelFor(taskType).generateContent(prompt);
    } catch (error) {
      lastError = error;
      if (attempt === env.AI_CALL_RETRIES) break;
      await wait(env.AI_CALL_RETRY_MS * (attempt + 1));
    }
  }
  throw providerError(lastError);
}

function featureTypeForTask(taskType, endpoint) {
  if (taskType === "medical_report" || endpoint === "reports.analyze") return "report_analysis";
  if (taskType === "doctor_assist") return "doctor_assist_request";
  if (endpoint?.includes("follow")) return "follow_up_question";
  return "chat_message";
}

export const aiGateway = {
  selectModel,

  async generateJson({ user, endpoint, taskType, prompt, cacheContext = {}, metadata = {} }) {
    const requestId = createId();
    const model = selectModel(taskType);
    const featureType = featureTypeForTask(taskType, endpoint);
    const optimizedPrompt = optimizePromptForCost(prompt);
    const safety = inspectPromptSafety(optimizedPrompt);
    const cacheKey = createCacheKey({ userId: user?.id, model, featureType, prompt: optimizedPrompt, cacheContext });
    const cached = aiResponseCache.get(cacheKey);
    const startedAt = Date.now();

    if (cached) {
      await recordUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model,
        prompt: optimizedPrompt,
        response: cached,
        cacheHit: true,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey, cacheLayer: "memory" },
        safetyFlags: safety.flags
      });
      return { text: cached, model, cacheHit: true, requestId, cost: { estimatedNaira: 0 } };
    }

    const persistentCache = await aiUsageRepository.findCache(cacheKey);
    if (persistentCache) {
      aiResponseCache.set(cacheKey, persistentCache.response_text);
      await recordUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model,
        prompt: optimizedPrompt,
        response: persistentCache.response_text,
        cacheHit: true,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey, cacheLayer: "database" },
        safetyFlags: safety.flags
      });
      return { text: persistentCache.response_text, model, cacheHit: true, requestId, cost: { estimatedNaira: 0 } };
    }

    const estimated = estimateUsage({ prompt: optimizedPrompt, model });
    await assertBudget({
      userId: user?.id,
      estimatedCost: estimated.costEstimate,
      estimatedCostNaira: estimated.costNaira,
      endpoint,
      featureType,
      model,
      prompt: optimizedPrompt,
      requestId,
      safetyFlags: safety.flags,
      metadata: { ...metadata, cacheKey }
    });

    try {
      const result = await generateContentWithRetry(taskType, optimizedPrompt);
      const text = result.response.text();
      aiResponseCache.set(cacheKey, text);
      await aiUsageRepository.storeCache({
        cacheKey,
        promptHash: safety.promptHash,
        featureType,
        modelUsed: model,
        responseText: text,
        ttlSeconds: env.AI_CACHE_TTL_SECONDS,
        metadata: { ...metadata, requestId }
      });
      await recordUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model,
        prompt: optimizedPrompt,
        response: text,
        cacheHit: false,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey },
        safetyFlags: safety.flags
      });

      return { text, model, cacheHit: false, requestId, cost: estimated };
    } catch (error) {
      await recordFailedUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model,
        prompt: optimizedPrompt,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey },
        error
      });
      throw error;
    }
  }
};
