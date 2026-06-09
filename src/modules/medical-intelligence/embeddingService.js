import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/database.js";
import { geminiProvider } from "../../ai/gateway/geminiProvider.js";
import { createId } from "../../utils/uuid.js";

const EXPECTED_EMBEDDING_DIMENSION = 768;

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function normalizeVector(values) {
  if (!Array.isArray(values) || !values.length) return [];
  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function validateEmbedding(values) {
  const normalized = normalizeVector(values);
  if (normalized.length !== EXPECTED_EMBEDDING_DIMENSION) {
    throw new Error(`Embedding response had dimension ${normalized.length}; expected ${EXPECTED_EMBEDDING_DIMENSION}.`);
  }
  return normalized;
}

async function fetchGeminiEmbedding(text) {
  if (!env.GEMINI_API_KEY) return null;
  return validateEmbedding(await geminiProvider.embed({ model: env.GEMINI_EMBEDDING_MODEL, text }));
}

async function findCachedEmbedding(textHash, client = pool) {
  const { rows } = await client.query("select * from medical_embeddings where text_hash = $1 limit 1", [textHash]);
  return rows[0] || null;
}

async function storeEmbedding({ textHash, sourceType, sourceId, sourceTitle, sourceUrl, text, embedding }, client = pool) {
  const id = createId();
  const { rows } = await client.query(
    `insert into medical_embeddings (id, text_hash, source_type, source_id, source_title, source_url, content_text, embedding)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     on duplicate key update
       source_type = values(source_type),
       source_id = values(source_id),
       source_title = values(source_title),
       source_url = values(source_url),
       content_text = values(content_text),
       embedding = coalesce(values(embedding), embedding),
       updated_at = now()
     returning *`,
    [id, textHash, sourceType, sourceId || null, sourceTitle || null, sourceUrl || null, text, embedding ? JSON.stringify(embedding) : null]
  );
  return rows[0];
}

export const embeddingService = {
  hashText,

  cosineSimilarity(left, right) {
    const a = normalizeVector(left);
    const b = normalizeVector(right);
    if (!a.length || a.length !== b.length) return 0;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < a.length; index += 1) {
      dot += a[index] * b[index];
      leftNorm += a[index] * a[index];
      rightNorm += b[index] * b[index];
    }
    if (!leftNorm || !rightNorm) return 0;
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  },

  async embedText(text, metadata = {}, client = pool) {
    const content = String(text || "").trim();
    if (!content) return null;
    const textHash = hashText(content);
    const cached = await findCachedEmbedding(textHash, client);
    if (cached?.embedding) return Array.isArray(cached.embedding) ? cached.embedding : JSON.parse(cached.embedding);

    const embedding = await fetchGeminiEmbedding(content);
    await storeEmbedding(
      {
        textHash,
        sourceType: metadata.sourceType || "query",
        sourceId: metadata.sourceId || null,
        sourceTitle: metadata.sourceTitle || null,
        sourceUrl: metadata.sourceUrl || null,
        text: content,
        embedding
      },
      client
    );
    return embedding;
  },

  async cacheSourceEmbedding(source, client = pool) {
    const text = [source.title, source.summary, source.content, source.explanation, source.definition, source.abstract].filter(Boolean).join("\n\n").trim();
    if (!text) return null;
    return this.embedText(
      text,
      {
        sourceType: source.sourceType,
        sourceId: source.id,
        sourceTitle: source.title || source.term || source.standard_name,
        sourceUrl: source.url || source.source_url || null
      },
      client
    );
  }
};
