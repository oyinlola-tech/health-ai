import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";
import { aiResponseCache } from "../cache/lruCache.js";

function hash(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || "")).digest("hex");
}

function cacheLevelFor({ userId, patientId, reportId, threadId }) {
  if (threadId) return "L3";
  if (userId || patientId || reportId) return "L2";
  return "L1";
}

export function createContextCacheKey({ question, reportId = null, patientId = null, retrievedChunks = [], medicalContext = "", taskType, model, cacheContext = {} }) {
  const retrievedChunksHash = hash(retrievedChunks.map((chunk) => ({
    id: chunk.id,
    source: chunk.source,
    url: chunk.url,
    similarity: chunk.similarity,
    text: chunk.chunk_text
  })));
  const medicalContextHash = hash(medicalContext);
  return {
    cacheKey: hash({
      question,
      reportId,
      patientId,
      retrievedChunksHash,
      medicalContextHash,
      taskType,
      model,
      cacheContext
    }),
    promptHash: hash(question),
    retrievedChunksHash,
    medicalContextHash
  };
}

export const contextCache = {
  levelFor: cacheLevelFor,

  async get(cacheKey) {
    const memory = aiResponseCache.get(cacheKey);
    if (memory) return { text: memory, layer: "memory" };

    const persistent = await aiUsageRepository.findCache(cacheKey);
    if (!persistent) return null;
    aiResponseCache.set(cacheKey, persistent.response_text);
    return { text: persistent.response_text, layer: "database" };
  },

  async set({ cacheKey, promptHash, featureType, modelUsed, responseText, metadata = {} }) {
    aiResponseCache.set(cacheKey, responseText);
    await aiUsageRepository.storeCache({
      cacheKey,
      promptHash,
      featureType,
      modelUsed,
      responseText,
      ttlSeconds: env.AI_CACHE_TTL_SECONDS,
      metadata
    });
  }
};
