# RAG Trusted Sources Report

## Summary

The RAG retriever now enforces trusted medical source allowlisting before context reaches the AI prompt.

## Trusted Sources

- National Institutes of Health
- MedlinePlus
- PubMed / NCBI
- World Health Organization

## Enforcement

- `src/rag/trustedSources.js` validates source names and URLs.
- `searchMedicalContext` only returns trusted chunks.
- MySQL-safe retrieval replaces old vector-specific assumptions at runtime.
- AI responses include source metadata via `sourcesUsed`.
- Stored AI interactions persist the structured response JSON, including citations when present.

## Guardrails

- No random web scraping is introduced.
- No user-provided URLs are fetched for RAG.
- If no trusted indexed context is available, AI prompting explicitly instructs conservative behavior instead of inventing citations.

