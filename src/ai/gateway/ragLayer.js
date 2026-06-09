import { env } from "../../config/env.js";
import { formatMedicalContext, searchMedicalContext } from "../../rag/retriever/search.js";

function confidenceFor(chunks = []) {
  if (!chunks.length) return 0;
  const best = Math.max(...chunks.map((chunk) => Number(chunk.similarity || 0)));
  return Math.max(0, Math.min(1, best));
}

export async function retrieveGroundingContext(query) {
  const chunks = await searchMedicalContext(query);
  const medicalContext = formatMedicalContext(chunks);
  const confidence = confidenceFor(chunks);
  return {
    chunks,
    medicalContext,
    confidence,
    grounded: confidence >= env.RAG_CONFIDENCE_THRESHOLD
  };
}
