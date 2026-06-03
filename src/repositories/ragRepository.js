import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

function vectorLiteral(values) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

export const ragRepository = {
  async upsertDocument({ source, title, url, content }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into medical_documents (id, source, title, url, content)
       values ($1, $2, $3, $4, $5)
       on conflict (url) do update
       set source = excluded.source,
           title = excluded.title,
           content = excluded.content
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
         values ($1, $2, $3, $4::vector, $5, $6)
         returning id, document_id, chunk_text, source, url, created_at`,
        [id, documentId, chunk.chunkText, vectorLiteral(chunk.embedding), chunk.source, chunk.url]
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
  }
};
