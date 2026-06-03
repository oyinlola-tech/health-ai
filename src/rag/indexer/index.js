import { ragRepository } from "../../repositories/ragRepository.js";
import { chunkText } from "../pipeline/chunk.js";
import { embedChunks } from "./embed.js";

export async function indexMedicalDocument(document) {
  const storedDocument = await ragRepository.upsertDocument(document);
  const chunks = chunkText(document.content);
  const embeddings = await embedChunks(chunks);
  const storedChunks = await ragRepository.replaceChunks({
    documentId: storedDocument.id,
    chunks: chunks.map((chunkTextValue, index) => ({
      chunkText: chunkTextValue,
      embedding: embeddings[index],
      source: document.source,
      url: document.url
    }))
  });

  return {
    document: storedDocument,
    chunks: storedChunks
  };
}
