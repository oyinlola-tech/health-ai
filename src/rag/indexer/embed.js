import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { errors } from "../../utils/errors.js";

const EXPECTED_EMBEDDING_DIMENSION = 768;

function embeddingModel() {
  if (!env.GEMINI_API_KEY) throw errors.config("GEMINI_API_KEY is required for RAG embeddings.");
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });
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
  const model = embeddingModel();
  const result = await model.embedContent(text);
  return validateEmbedding(result.embedding?.values || []);
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
