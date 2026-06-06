# AI Cost Architecture

## Implementation Summary

Implemented a backend-enforced AI cost governance layer for MedExplain AI.

Core files:

- `src/ai/gateway/ai.router.js`
- `src/ai/monitor/usageTracker.js`
- `src/repositories/aiUsageRepository.js`
- `src/services/aiUsageService.js`
- `src/migrations/007_ai_cost_governance.sql`

All Gemini calls now pass through the AI gateway, where requests are assigned a request id, optimized, screened, budget checked, routed to a model, cached, and logged.

## Usage Logging

Every AI request stores:

- user id
- feature type
- request id
- model used
- input tokens
- output tokens
- total tokens
- estimated cost
- NGN cost
- optional NGN cost
- response time
- cache hit status
- blocked reason
- safety flags
- timestamp

## Budget Layers

Implemented:

- User monthly quota through `user_ai_quotas`
- Global monthly budget through `ai_budget_limits`
- Feature monthly budgets through `ai_budget_limits`
- Emergency throttle mode
- Daily request caps
- Burst-per-minute protection

Budget failures return structured `AI_BUDGET_EXCEEDED` responses.

## Admin Metrics

Admin dashboards expose:

- total spend
- monthly budget
- forecasted burn rate
- cache hit rate
- blocked request count
- cost by feature
- cost by model
- top AI users
- expensive requests
