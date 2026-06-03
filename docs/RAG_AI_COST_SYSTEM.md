# RAG and AI Cost Control System

## Architecture Diagram

```text
Trusted sources
  MedlinePlus | NIH | CDC | WHO
        |
        v
src/rag/crawlers/* -> src/rag/pipeline/fetch.js -> clean.js -> chunk.js
        |
        v
src/rag/indexer/embed.js -> PostgreSQL pgvector
        |                    medical_documents
        |                    medical_chunks
        v
src/rag/retriever/search.js
        |
        v
src/services/aiService.js
        |
        v
src/ai/gateway/ai.router.js
        |      |       |
        |      |       +-> src/ai/cache/lruCache.js
        |      +----------> src/ai/monitor/usageTracker.js
        |                  ai_usage_logs
        v
Gemini backend-only API
```

## RAG Pipeline

The crawler layer only accepts trusted source URLs from `medlineplus.gov`, `nih.gov`, `cdc.gov`, and `who.int`. HTML is fetched server-side, cleaned to remove scripts, styles, navigation, headers, footers, forms, and SVG noise, then split into sentence-preserving chunks sized for 300-800 word semantic passages.

The indexer stores source documents in `medical_documents`, embeds chunks with the configured Gemini embedding model, and stores vectors in `medical_chunks` using pgvector. Retrieval embeds the user query, performs cosine vector search, and returns the top configured chunks with source URLs.

## AI Cost Optimization

All Gemini requests now go through `src/ai/gateway/ai.router.js`. The gateway selects Flash for simple chat and Pro for medical report analysis, normalizes prompts, caches identical prompt/user/context combinations in an in-memory LRU cache, estimates tokens and cost, checks per-user and global daily budgets, and logs usage to `ai_usage_logs`.

Repeated cache hits are recorded with zero estimated cost. Budget breaches create blocked usage log entries and return graceful forbidden responses without calling Gemini.

## Database Schema Updates

- `medical_documents`: trusted source document metadata and cleaned content.
- `medical_chunks`: semantic chunks with pgvector embeddings and source URLs.
- `ai_usage_logs`: prompt/response token estimates, model, endpoint, cache hits, costs, and blocked budget events.

## Created Files

- `src/rag/crawlers/base.crawler.js`
- `src/rag/crawlers/medline.crawler.js`
- `src/rag/crawlers/nih.crawler.js`
- `src/rag/crawlers/cdc.crawler.js`
- `src/rag/crawlers/who.crawler.js`
- `src/rag/pipeline/fetch.js`
- `src/rag/pipeline/clean.js`
- `src/rag/pipeline/chunk.js`
- `src/rag/indexer/embed.js`
- `src/rag/indexer/index.js`
- `src/rag/retriever/search.js`
- `src/rag/sources.js`
- `src/ai/cache/lruCache.js`
- `src/ai/gateway/ai.router.js`
- `src/ai/monitor/usageTracker.js`
- `src/repositories/ragRepository.js`
- `src/repositories/aiUsageRepository.js`
- `src/services/aiUsageService.js`
- `src/controllers/aiUsageController.js`
- `src/migrations/002_rag_ai_costs.sql`

## Performance Improvements

- Vector search uses an ivfflat pgvector index for fast retrieval.
- Embeddings are batched at the indexer boundary.
- RAG context is trimmed before prompt injection.
- Prompt normalization improves cache hit rates.
- Repeated AI calls are served from an LRU cache where possible.

## Security Summary

- Only trusted medical domains are accepted by crawler fetches.
- API keys remain backend-only.
- AI usage analytics endpoints require Admin role.
- AI requests are budget-guarded before provider calls.
- Prompt responses remain schema-validated before storage/display.
