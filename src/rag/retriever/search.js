import { env } from "../../config/env.js";
import { ragRepository } from "../../repositories/ragRepository.js";
import { logger } from "../../utils/logger.js";
import { embedText } from "../indexer/embed.js";

export async function searchMedicalContext(query, { limit = env.RAG_RETRIEVAL_LIMIT } = {}) {
  if (!query?.trim()) return [];

  try {
    const embedding = await embedText(query);
    return ragRepository.searchChunksByEmbedding({ embedding, limit });
  } catch (error) {
    logger.warn("RAG retrieval failed.", { message: error.message });
    return [];
  }
}

export function formatMedicalContext(chunks, { maxChars = env.RAG_MAX_CONTEXT_CHARS } = {}) {
  if (!chunks.length) return "";

  const context = chunks
    .map((chunk, index) => {
      const source = `${chunk.source}: ${chunk.url}`;
      return `[${index + 1}] ${source}\n${chunk.chunk_text}`;
    })
    .join("\n\n");

  return context.length > maxChars ? `${context.slice(0, maxChars)}\n[Context trimmed for cost control]` : context;
}
