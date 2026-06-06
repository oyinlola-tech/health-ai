import { pool } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { embeddingService } from "./embeddingService.js";
import { medicalKnowledgeBase } from "./medicalKnowledgeBase.js";

function lexicalScore(query, source) {
  const terms = String(query || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 2);
  const text = [source.title, source.summary, source.sourceType, source.source].filter(Boolean).join(" ").toLowerCase();
  if (!terms.length || !text) return 0;
  const hits = terms.filter((term) => text.includes(term)).length;
  return hits / terms.length;
}

function sourceText(source) {
  return [source.title, source.summary].filter(Boolean).join("\n\n").slice(0, 4000);
}

export const ragEngine = {
  async retrieve(query, { limit = 8, useEmbeddings = true } = {}, client = pool) {
    if (!String(query || "").trim()) return [];
    const lexicalSources = await medicalKnowledgeBase.unifiedSearch(query, { limit: Math.max(limit * 2, 10) }, client);
    let queryEmbedding = null;
    if (useEmbeddings) {
      try {
        queryEmbedding = await embeddingService.embedText(query, { sourceType: "query" }, client);
      } catch (error) {
        logger.warn("Medical intelligence embedding retrieval fell back to lexical search.", { message: error.message });
      }
    }

    const scored = [];
    for (const source of lexicalSources) {
      let similarity = lexicalScore(query, source);
      if (queryEmbedding) {
        try {
          const embedding = await embeddingService.cacheSourceEmbedding(source, client);
          if (embedding) similarity = Math.max(similarity, embeddingService.cosineSimilarity(queryEmbedding, embedding));
        } catch (error) {
          logger.warn("Source embedding cache failed during RAG retrieval.", { sourceType: source.sourceType, message: error.message });
        }
      }
      scored.push({
        ...source,
        content: sourceText(source),
        similarity: Number(similarity.toFixed(4))
      });
    }

    return scored.sort((left, right) => right.similarity - left.similarity).slice(0, limit);
  },

  formatContext(sources, { maxChars = 6000 } = {}) {
    const context = sources
      .map((source, index) => {
        const citation = `${source.sourceType}: ${source.title}${source.url ? ` (${source.url})` : ""}`;
        return `[${index + 1}] ${citation}\n${source.content || source.summary || ""}`;
      })
      .join("\n\n");
    return context.length > maxChars ? `${context.slice(0, maxChars)}\n[Context trimmed]` : context;
  }
};
