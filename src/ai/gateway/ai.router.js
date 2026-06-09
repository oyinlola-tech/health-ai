import { env } from "../../config/env.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";
import { createId } from "../../utils/uuid.js";
import { assertBudget, estimateUsage, inspectPromptSafety, optimizePromptForCost, recordFailedUsage, recordUsage } from "../monitor/usageTracker.js";
import { contextCache, createContextCacheKey } from "./contextCache.js";
import { geminiProvider } from "./geminiProvider.js";
import { modelRegistry } from "./modelRegistry.js";
import { fallbackModel, selectModel } from "./modelRouter.js";
import { retrieveGroundingContext } from "./ragLayer.js";
import { formatGatewayResponse, providerError } from "./responseFormatter.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry({ model, prompt }) {
  let lastError;
  for (let attempt = 0; attempt <= env.AI_CALL_RETRIES; attempt += 1) {
    try {
      return await geminiProvider.generateJson({ model, prompt });
    } catch (error) {
      lastError = error;
      if (attempt === env.AI_CALL_RETRIES) break;
      await wait(env.AI_CALL_RETRY_MS * (attempt + 1));
    }
  }
  throw providerError(lastError);
}

async function generateWithFailover({ model, prompt, taskType }) {
  try {
    const result = await generateContentWithRetry({ model, prompt });
    return { ...result, model, failover: null };
  } catch (error) {
    const backup = fallbackModel();
    if (!backup || backup === model) throw error;
    const result = await generateContentWithRetry({ model: backup, prompt });
    return {
      ...result,
      model: backup,
      failover: {
        from: model,
        to: backup,
        taskType,
        reason: error.code || error.message || "provider_failure"
      }
    };
  }
}

function featureTypeForTask(taskType, endpoint) {
  if (taskType === "medical_report" || endpoint === "reports.analyze") return "report_analysis";
  if (taskType === "doctor_assist") return "doctor_assist_request";
  if (endpoint?.includes("follow")) return "follow_up_question";
  return "chat_message";
}

async function groundingFor({ question, prompt, retrievedChunks, medicalContext, metadata }) {
  if (Array.isArray(retrievedChunks) && medicalContext !== null && medicalContext !== undefined) {
    return {
      chunks: retrievedChunks,
      medicalContext,
      confidence: Number(metadata.ragConfidence || 0),
      grounded: Boolean(metadata.ragGrounded)
    };
  }
  return retrieveGroundingContext(question || prompt);
}

async function logFailover({ user, endpoint, featureType, requestId, failover, safetyFlags }) {
  if (!failover) return;
  await aiUsageRepository.create({
    userId: user?.id,
    endpoint,
    featureType,
    modelUsed: failover.to,
    tokensUsed: 0,
    promptTokens: 0,
    responseTokens: 0,
    costEstimate: 0,
    costNaira: 0,
    cacheHit: false,
    requestId,
    status: "failover",
    metadata: failover,
    safetyFlags
  });
}

export const aiGateway = {
  selectModel,
  modelRegistry,

  async generateJson({
    user,
    endpoint,
    taskType,
    prompt,
    question = null,
    reportId = null,
    patientId = null,
    retrievedChunks = null,
    medicalContext = null,
    cacheContext = {},
    metadata = {}
  }) {
    const requestId = createId();
    const model = selectModel(taskType);
    const featureType = featureTypeForTask(taskType, endpoint);
    const optimizedPrompt = optimizePromptForCost(prompt);
    const safety = inspectPromptSafety(optimizedPrompt);
    const rag = await groundingFor({ question, prompt: optimizedPrompt, retrievedChunks, medicalContext, metadata });
    const cacheIdentity = createContextCacheKey({
      question: question || optimizedPrompt,
      reportId,
      patientId: patientId || user?.id || null,
      retrievedChunks: rag.chunks,
      medicalContext: rag.medicalContext,
      taskType,
      model,
      cacheContext
    });
    const cacheLevel = contextCache.levelFor({ userId: user?.id, patientId: patientId || user?.id, reportId, threadId: cacheContext.threadId });
    const cacheKey = cacheIdentity.cacheKey;
    const startedAt = Date.now();

    const cached = await contextCache.get(cacheKey);
    if (cached) {
      await recordUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model,
        prompt: optimizedPrompt,
        response: cached.text,
        cacheHit: true,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey, cacheLayer: cached.layer, cacheLevel, ragConfidence: rag.confidence, ragGrounded: rag.grounded },
        safetyFlags: safety.flags
      });
      return formatGatewayResponse({
        text: cached.text,
        model,
        cacheHit: true,
        requestId,
        cost: { estimatedNaira: 0 },
        rag: { confidence: rag.confidence, grounded: rag.grounded, chunkCount: rag.chunks.length },
        cache: { key: cacheKey, level: cacheLevel, layer: cached.layer }
      });
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
      metadata: { ...metadata, cacheKey, cacheLevel, ragConfidence: rag.confidence, ragGrounded: rag.grounded }
    });

    try {
      const result = await generateWithFailover({ model, prompt: optimizedPrompt, taskType });
      await contextCache.set({
        cacheKey,
        promptHash: cacheIdentity.promptHash || safety.promptHash,
        featureType,
        modelUsed: result.model,
        responseText: result.text,
        metadata: {
          ...metadata,
          requestId,
          cacheLevel,
          retrievedChunksHash: cacheIdentity.retrievedChunksHash,
          medicalContextHash: cacheIdentity.medicalContextHash,
          ragConfidence: rag.confidence,
          ragGrounded: rag.grounded
        }
      });
      await recordUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model: result.model,
        prompt: optimizedPrompt,
        response: result.text,
        cacheHit: false,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey, cacheLevel, ragConfidence: rag.confidence, ragGrounded: rag.grounded, failover: result.failover },
        safetyFlags: safety.flags
      });
      await logFailover({ user, endpoint, featureType, requestId, failover: result.failover, safetyFlags: safety.flags });

      return formatGatewayResponse({
        text: result.text,
        model: result.model,
        cacheHit: false,
        requestId,
        cost: estimated,
        failover: result.failover,
        rag: { confidence: rag.confidence, grounded: rag.grounded, chunkCount: rag.chunks.length },
        cache: { key: cacheKey, level: cacheLevel, layer: "miss" }
      });
    } catch (error) {
      await recordFailedUsage({
        userId: user?.id,
        endpoint,
        featureType,
        model,
        prompt: optimizedPrompt,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        metadata: { ...metadata, cacheKey, cacheLevel, ragConfidence: rag.confidence, ragGrounded: rag.grounded },
        error
      });
      throw providerError(error);
    }
  }
};
