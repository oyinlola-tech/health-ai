# Gemini Optimization Report

## Model Routing

Implemented dynamic model selection:

- Primary report analysis uses `GEMINI_REPORT_MODEL`, falling back to `GEMINI_PRO_MODEL`, defaulting to `gemini-3-flash`
- Doctor assist requests use `GEMINI_REPORT_MODEL`, falling back to `GEMINI_PRO_MODEL`, defaulting to `gemini-3-flash`
- REST AI chat and summaries use `GEMINI_FLASH_MODEL`, defaulting to `gemini-3.1-flash-lite`
- Realtime chat and future voice tasks use `GEMINI_LIVE_MODEL`, defaulting to `gemini-3.1-flash-live-preview`
- Future TTS tasks use `GEMINI_TTS_MODEL`, defaulting to `gemini-3.1-flash-tts`
- Fallback model configuration uses `GEMINI_FALLBACK_MODEL`, defaulting to `gemini-3.1-flash-lite`
- Embeddings use `GEMINI_EMBEDDING_MODEL`, defaulting to `gemini-embedding-2`

The frontend does not choose models.

## Prompt Optimization

Before Gemini:

- repeated whitespace is reduced
- excessive blank lines are removed
- oversized context is compressed server-side
- prompts are hashed for cache lookup and audit trails

## Cache Strategy

Implemented two cache layers:

- in-memory LRU cache for fast repeated requests
- persistent MySQL cache in `ai_cache_store`

Cache keys include:

- user id
- model
- feature type
- optimized prompt
- request context

Cache hits are logged with zero Gemini cost.

## Failure Logging

Provider or schema failures are recorded as failed AI usage logs with request id, latency, prompt hash, and feature metadata.
