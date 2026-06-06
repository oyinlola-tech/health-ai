# AI Billing Model

## Cost Calculation

Token estimates are calculated server-side for:

- input tokens
- output tokens
- total tokens

Cost is calculated from model-specific per-1K-token rates:

- `AI_FLASH_COST_PER_1K_TOKENS_NAIRA`
- `AI_PRO_COST_PER_1K_TOKENS_NAIRA`
- `AI_EMBEDDING_COST_PER_1K_TOKENS_NAIRA`

The system stores AI usage and budget estimates in Naira. No foreign-exchange conversion is performed in the application.

## Plan-Aware Quotas

Free users receive lower monthly AI cost and daily request limits.

Premium users receive higher monthly AI cost and daily request limits.

Plan and quota snapshots are persisted in `user_ai_quotas`.

## Budget Exceeded Response

When a budget is exceeded, the API returns:

```json
{
  "code": "AI_BUDGET_EXCEEDED",
  "message": "Upgrade required for more AI usage",
  "retry_after": "30 days"
}
```

## Operational Controls

Operators can configure defaults through environment variables and persist active budgets in `ai_budget_limits`.

Emergency throttling is supported at the system budget level.
