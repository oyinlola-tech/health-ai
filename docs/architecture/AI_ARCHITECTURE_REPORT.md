# AI Architecture Report

## Summary

MedExplain AI now routes AI work through a layered backend gateway instead of allowing controllers or feature services to call Gemini directly.

Implemented flow:

Client -> AI Controller -> AI Service -> AI Gateway -> Context Cache -> Usage Layer -> RAG Layer -> Model Router -> Gemini Provider -> Response Formatter

Controllers do not import Gemini SDK code. The only Gemini SDK adapter is `src/ai/gateway/geminiProvider.js`.

## Model Registry

The model registry is defined in `src/ai/gateway/modelRegistry.js` and reads:

| Capability | Env var | Default |
| --- | --- | --- |
| Chat | `GEMINI_CHAT_MODEL` | `gemini-3-flash` |
| Report analysis | `GEMINI_REPORT_MODEL` | `gemini-3-flash` |
| Live chat / voice | `GEMINI_LIVE_MODEL` | `gemini-3.1-flash-live-preview` |
| Embeddings | `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-2` |
| Fallback | `GEMINI_FALLBACK_MODEL` | `gemini-3.1-flash-lite` |

Legacy aliases such as `GEMINI_FLASH_MODEL` and `GEMINI_PRO_MODEL` remain supported for compatibility.

## Model Routing

`src/ai/gateway/modelRouter.js` maps task families to capabilities:

| Task family | Model capability |
| --- | --- |
| Medical reports, lab reports, blood reports, discharge notes | `report` |
| Medical chat and follow-up questions | `chat` |
| WebSocket/live/voice tasks | `live` |
| Vector and semantic search | `embedding` |
| Failover | `fallback` |

## Context-Aware Cache

Cache keys are built in `src/ai/gateway/contextCache.js`.

The key includes:

- Question
- Report ID
- Patient ID
- Retrieved RAG chunks hash
- Medical context hash
- Task type
- Model
- Session/thread context

This avoids unsafe reuse based on prompt text alone.

Cache levels:

- L1: global medical knowledge
- L2: patient/report-specific reuse
- L3: live session or conversation-thread reuse

Cache hits are tracked in `ai_usage_logs` and summarized for the admin dashboard.

## RAG Layer

`src/ai/gateway/ragLayer.js` retrieves trusted medical context before model calls and computes a confidence score from retrieved chunk similarity.

The gateway records:

- RAG confidence
- Whether confidence crossed `RAG_CONFIDENCE_THRESHOLD`
- Retrieved chunk count

Report and chat prompts still enforce strict JSON schemas, so grounded context is injected into Gemini rather than returning unstructured raw chunks to users.

## Usage Tracking

The existing `ai_usage_logs` table is used for production tracking.

It records:

- User ID
- Model
- Prompt/completion tokens
- Latency
- Estimated cost
- Cache hit status
- Status
- Safety flags
- Metadata including cache level, RAG confidence, and failover details

Admin metrics now include total requests, requests per model, cache hit rate, RAG hit rate, token usage, estimated cost, failovers, and average latency.

## Failover

Chat and report generation route to `GEMINI_FALLBACK_MODEL` if the primary model fails after configured retries.

Provider errors are normalized by `src/ai/gateway/responseFormatter.js` so raw Gemini errors are not exposed to users.

Failovers are logged as `status = "failover"` events in `ai_usage_logs`.

## Diagnostics

Admin-only system diagnostics were added:

- `GET /api/system/test-chat-model`
- `GET /api/system/test-report-model`
- `GET /api/system/test-live-model`
- `GET /api/system/test-embedding-model`
- `GET /api/system/test-rag`
- `GET /api/system/test-cache`

The existing `POST /api/system/test-gemini` now runs through the diagnostics service and gateway provider instead of importing Gemini in the controller.

## Admin Dashboard

The AI Operations workspace now emphasizes platform health:

- Requests
- Tokens
- Cache hit rate
- RAG hit rate
- Failovers
- Model-level request/cost/token rows

## Extension Points

Future providers can be added by implementing a provider adapter with the same methods as `geminiProvider`.

Future live streaming can route through the existing `live` capability without changing controller boundaries.
