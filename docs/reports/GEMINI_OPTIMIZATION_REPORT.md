# Gemini Optimization Report

## Model Routing

Implemented dynamic model selection:

- Medical report analysis uses `GEMINI_PRO_MODEL`
- Doctor assist requests use `GEMINI_PRO_MODEL`
- Simple chat uses `GEMINI_FLASH_MODEL`
- Summaries use `GEMINI_FLASH_MODEL`

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
