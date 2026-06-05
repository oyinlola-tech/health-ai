import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

function vectorLiteral(values) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function searchPattern(query) {
  return `%${String(query || "")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 2)
    .slice(0, 8)
    .join("%")}%`;
}

export const ragRepository = {
  async upsertDocument({ source, title, url, content }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into medical_documents (id, source, title, url, content)
       values ($1, $2, $3, $4, $5)
       on duplicate key update
       source = values(source),
       title = values(title),
       content = values(content)
       returning *`,
      [id, source, title, url, content]
    );
    return rows[0];
  },

  async replaceChunks({ documentId, chunks }, client = pool) {
    await client.query("delete from medical_chunks where document_id = $1", [documentId]);

    const stored = [];
    for (const chunk of chunks) {
      const id = createId();
      const { rows } = await client.query(
        `insert into medical_chunks (id, document_id, chunk_text, embedding, source, url)
         values ($1, $2, $3, $4, $5, $6)
         returning id, document_id, chunk_text, source, url, created_at`,
        [id, documentId, chunk.chunkText, chunk.embedding ? vectorLiteral(chunk.embedding) : null, chunk.source, chunk.url]
      );
      stored.push(rows[0]);
    }

    return stored;
  },

  async searchChunksByEmbedding({ embedding, limit = 5 }, client = pool) {
    const { rows } = await client.query(
      `select id,
              document_id,
              chunk_text,
              source,
              url,
              1 - (embedding <=> $1::vector) as similarity
       from medical_chunks
       order by embedding <=> $1::vector
       limit $2`,
      [vectorLiteral(embedding), limit]
    );
    return rows;
  },

  async searchTrustedChunks({ query, limit = 5 }, client = pool) {
    const pattern = searchPattern(query);
    const { rows } = await client.query(
      `select id, document_id, chunk_text, source, url, 1 as similarity
       from medical_chunks
       where (
         lower(source) like '%nih%'
         or lower(source) like '%medlineplus%'
         or lower(source) like '%pubmed%'
         or lower(source) like '%world health organization%'
         or lower(source) like '%who%'
         or url like 'https://%.nih.gov%'
         or url like 'https://medlineplus.gov%'
         or url like 'https://pubmed.ncbi.nlm.nih.gov%'
         or url like 'https://%.ncbi.nlm.nih.gov%'
         or url like 'https://%.who.int%'
       )
       and (chunk_text like $1 or source like $1)
       order by created_at desc
       limit $2`,
      [pattern, limit]
    );
    return rows;
  }
};
