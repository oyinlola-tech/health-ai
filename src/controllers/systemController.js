import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/response.js";

const geminiTestPrompts = [
  {
    name: "basicGreeting",
    prompt: "Reply with one short friendly greeting for a health app system test."
  },
  {
    name: "medicalReport",
    prompt:
      "System test: explain this lab snippet in one cautious educational sentence without diagnosis: Hemoglobin 13.8 g/dL, WBC 6.1 x10^9/L."
  },
  {
    name: "chat",
    prompt: "System test: answer in one sentence: what does hydration mean?"
  },
  {
    name: "rag",
    prompt:
      "System test: using only general trusted-source style wording, explain what PubMed and MedlinePlus are in one sentence."
  }
];

function withTimeout(promise, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Gemini test timed out after ${ms}ms.`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function runGeminiPrompt(model, test) {
  const startedAt = Date.now();
  try {
    const result = await withTimeout(model.generateContent(test.prompt), 30000);
    const usage = result.response?.usageMetadata || {};
    return {
      name: test.name,
      status: "PASS",
      responseTimeMs: Date.now() - startedAt,
      model: env.GEMINI_FLASH_MODEL,
      tokenUsage: {
        promptTokens: usage.promptTokenCount ?? null,
        responseTokens: usage.candidatesTokenCount ?? null,
        totalTokens: usage.totalTokenCount ?? null
      },
      preview: result.response.text().slice(0, 240)
    };
  } catch (error) {
    return {
      name: test.name,
      status: "FAIL",
      responseTimeMs: Date.now() - startedAt,
      model: env.GEMINI_FLASH_MODEL,
      error: error.message
    };
  }
}

export const systemController = {
  async testGemini(_req, res) {
    if (!env.GEMINI_API_KEY) {
      return sendSuccess(res, {
        configured: false,
        status: "FAIL",
        tests: geminiTestPrompts.map((test) => ({
          name: test.name,
          status: "FAIL",
          error: "GEMINI_API_KEY is not configured."
        }))
      });
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: env.GEMINI_FLASH_MODEL });
    const tests = [];
    for (const test of geminiTestPrompts) {
      tests.push(await runGeminiPrompt(model, test));
    }

    return sendSuccess(res, {
      configured: true,
      status: tests.every((test) => test.status === "PASS") ? "PASS" : "FAIL",
      tests
    });
  }
};
