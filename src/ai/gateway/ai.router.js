import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { errors } from "../../utils/errors.js";
import { aiResponseCache, createCacheKey } from "../cache/lruCache.js";
import { assertBudget, estimateUsage, recordUsage } from "../monitor/usageTracker.js";

const jsonGenerationConfig = {
  responseMimeType: "application/json"
};

function selectModel(taskType) {
  if (taskType === "medical_report") return env.GEMINI_PRO_MODEL;
  return env.GEMINI_FLASH_MODEL;
}

function modelFor(taskType) {
  if (!env.GEMINI_API_KEY) throw errors.config("GEMINI_API_KEY is required for AI operations.");
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: selectModel(taskType), generationConfig: jsonGenerationConfig });
}

function optimizePrompt(prompt) {
  return prompt.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export const aiGateway = {
  selectModel,

  async generateJson({ user, endpoint, taskType, prompt, cacheContext = {}, metadata = {} }) {
    const model = selectModel(taskType);
    const optimizedPrompt = optimizePrompt(prompt);
    const cacheKey = createCacheKey({ userId: user?.id, model, prompt: optimizedPrompt, cacheContext });
    const cached = aiResponseCache.get(cacheKey);

    if (cached) {
      await recordUsage({
        userId: user?.id,
        endpoint,
        model,
        prompt: optimizedPrompt,
        response: cached,
        cacheHit: true,
        metadata: { ...metadata, cacheKey }
      });
      return { text: cached, model, cacheHit: true };
    }

    const estimated = estimateUsage({ prompt: optimizedPrompt, model });
    await assertBudget({ userId: user?.id, estimatedCost: estimated.costEstimate, endpoint, model });

    const result = await modelFor(taskType).generateContent(optimizedPrompt);
    const text = result.response.text();
    aiResponseCache.set(cacheKey, text);
    await recordUsage({
      userId: user?.id,
      endpoint,
      model,
      prompt: optimizedPrompt,
      response: text,
      cacheHit: false,
      metadata: { ...metadata, cacheKey }
    });

    return { text, model, cacheHit: false };
  }
};
