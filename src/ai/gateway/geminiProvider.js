import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { errors } from "../../utils/errors.js";

const jsonGenerationConfig = {
  responseMimeType: "application/json"
};

function client() {
  if (!env.GEMINI_API_KEY) throw errors.config("GEMINI_API_KEY is required for AI operations.");
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

function generativeModel(model, generationConfig = jsonGenerationConfig) {
  return client().getGenerativeModel({ model, generationConfig });
}

export const geminiProvider = {
  async generateJson({ model, prompt }) {
    const result = await generativeModel(model).generateContent(prompt);
    return {
      text: result.response.text(),
      usageMetadata: result.response?.usageMetadata || {}
    };
  },

  async embed({ model, text }) {
    const result = await generativeModel(model, undefined).embedContent(text);
    return result.embedding?.values || [];
  },

  async healthCheck({ model, prompt, timeoutMs = 30000 }) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Gemini test timed out after ${timeoutMs}ms.`)), timeoutMs);
    });
    const startedAt = Date.now();
    try {
      const result = await Promise.race([generativeModel(model).generateContent(prompt), timeout]);
      const usage = result.response?.usageMetadata || {};
      return {
        status: "PASS",
        model,
        responseTimeMs: Date.now() - startedAt,
        tokenUsage: {
          promptTokens: usage.promptTokenCount ?? null,
          responseTokens: usage.candidatesTokenCount ?? null,
          totalTokens: usage.totalTokenCount ?? null
        },
        preview: result.response.text().slice(0, 240)
      };
    } catch (error) {
      return {
        status: "FAIL",
        model,
        responseTimeMs: Date.now() - startedAt,
        error: error.message
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
