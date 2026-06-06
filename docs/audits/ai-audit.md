# AI Audit

Generated: 2026-06-06

## Result

AI calls are routed through backend services, use Gemini via `src/ai/gateway/ai.router.js`, and are guarded by entitlement, consent, usage budget, caching, prompt safety inspection, structured JSON validation, and RAG retrieval.

## Verified

- The medical prompt explicitly says the assistant is not a doctor and must not diagnose, prescribe, or replace a clinician.
- Report analysis requires AI consent and report ownership checks.
- Report analysis refuses low-quality extraction states.
- Prompts wrap patient/report input as untrusted medical content.
- Responses are parsed against strict Zod schemas.
- Sources are attached from retrieved trusted context when model output omits them.
- Raw PHI prompts are not stored in `ai_interactions`; audit metadata is stored instead.
- Budget and quota logic records usage and blocks over-limit calls.

## Remaining Work

- Live Gemini calls were not performed because provider credentials were not verified.
- RAG source freshness should be operationalized with scheduled crawler/indexer jobs.
