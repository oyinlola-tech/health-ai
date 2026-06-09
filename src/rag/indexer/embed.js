import { env } from "../../config/env.js";
import { geminiProvider } from "../../ai/gateway/geminiProvider.js";
import { errors } from "../../utils/errors.js";

const EXPECTED_EMBEDDING_DIMENSION = 768;

function ensureEmbeddingConfigured() {
  if (!env.GEMINI_API_KEY) throw errors.config("GEMINI_API_KEY is required for RAG embeddings.");
}

function validateEmbedding(values) {
  if (!Array.isArray(values) || values.length !== EXPECTED_EMBEDDING_DIMENSION) {
    throw errors.badRequest("Embedding response had an unexpected dimension.", {
      expected: EXPECTED_EMBEDDING_DIMENSION,
      received: Array.isArray(values) ? values.length : 0
    });
  }
  return values;
}

export async function embedText(text) {
  ensureEmbeddingConfigured();
  return validateEmbedding(await geminiProvider.embed({ model: env.GEMINI_EMBEDDING_MODEL, text }));
}

export async function embedChunks(chunks, { batchSize = 16 } = {}) {
  const embeddings = [];
  for (let index = 0; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));
    embeddings.push(...batchEmbeddings);
  }
  return embeddings;
}
