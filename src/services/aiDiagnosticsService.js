import { env } from "../config/env.js";
import { contextCache, createContextCacheKey } from "../ai/gateway/contextCache.js";
import { geminiProvider } from "../ai/gateway/geminiProvider.js";
import { modelRegistry } from "../ai/gateway/modelRegistry.js";
import { retrieveGroundingContext } from "../ai/gateway/ragLayer.js";
import { aiGateway } from "../ai/gateway/ai.router.js";
import { errors } from "../utils/errors.js";

function notConfiguredResult(model) {
  return {
    configured: false,
    status: "FAIL",
    model,
    error: "GEMINI_API_KEY is not configured."
  };
}

async function modelHealth(capability, prompt) {
  const registry = modelRegistry();
  const model = registry[capability];
  if (!env.GEMINI_API_KEY) return notConfiguredResult(model);
  const result = await geminiProvider.healthCheck({ model, prompt });
  return {
    configured: true,
    capability,
    ...result
  };
}

export const aiDiagnosticsService = {
  registry() {
    return modelRegistry();
  },

  testChatModel() {
    return modelHealth("chat", "Reply with one short friendly greeting for a health app system test.");
  },

  testReportModel() {
    return modelHealth("report", "Return JSON only: {\"summary\":\"Hemoglobin 13.8 g/dL is within many adult reference ranges.\"}");
  },

  testLiveModel() {
    return modelHealth("live", "Reply with one short sentence for a live chat readiness test.");
  },

  async testEmbeddingModel() {
    const registry = modelRegistry();
    const model = registry.embedding;
    if (!env.GEMINI_API_KEY) return notConfiguredResult(model);
    const startedAt = Date.now();
    try {
      const values = await geminiProvider.embed({ model, text: "MedExplain AI embedding diagnostics." });
      return {
        configured: true,
        status: values.length ? "PASS" : "FAIL",
        model,
        responseTimeMs: Date.now() - startedAt,
        dimensions: values.length
      };
    } catch (error) {
      return {
        configured: true,
        status: "FAIL",
        model,
        responseTimeMs: Date.now() - startedAt,
        error: error.message
      };
    }
  },

  async testRag(query = "What does high glucose mean?") {
    const result = await retrieveGroundingContext(query);
    return {
      status: result.chunks.length ? "PASS" : "WARN",
      query,
      confidence: result.confidence,
      grounded: result.grounded,
      threshold: env.RAG_CONFIDENCE_THRESHOLD,
      chunks: result.chunks.map((chunk) => ({
        id: chunk.id,
        source: chunk.source,
        url: chunk.url,
        similarity: chunk.similarity
      }))
    };
  },

  async testCache() {
    const registry = modelRegistry();
    const identity = createContextCacheKey({
      question: "What does high glucose mean?",
      reportId: "diagnostic-report",
      patientId: "diagnostic-patient",
      retrievedChunks: [{ id: "diagnostic-chunk", source: "MedlinePlus", url: "https://medlineplus.gov", chunk_text: "Glucose is a sugar in the blood." }],
      medicalContext: "Glucose is a sugar in the blood.",
      taskType: "simple_chat",
      model: registry.chat,
      cacheContext: { threadId: "diagnostic-session" }
    });
    const cacheLevel = contextCache.levelFor({ patientId: "diagnostic-patient", reportId: "diagnostic-report", threadId: "diagnostic-session" });
    return {
      status: "PASS",
      cacheKey: identity.cacheKey,
      cacheLevel,
      includes: ["question", "report_id", "patient_id", "retrieved_rag_chunks", "medical_context"],
      trackedLevels: ["L1 global medical knowledge", "L2 patient-specific", "L3 live session"]
    };
  },

  async testGeminiSuite() {
    const tests = await Promise.all([this.testChatModel(), this.testReportModel(), this.testRag(), this.testCache()]);
    return {
      configured: Boolean(env.GEMINI_API_KEY),
      status: tests.every((test) => test.status === "PASS") ? "PASS" : "FAIL",
      registry: aiGateway.modelRegistry(),
      tests
    };
  },

  unsupported() {
    throw errors.notFound("AI diagnostic is not supported.");
  }
};
