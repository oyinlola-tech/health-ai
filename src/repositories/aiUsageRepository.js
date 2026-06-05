import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const aiUsageRepository = {
  async create(log, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into ai_usage_logs (
         id, user_id, endpoint, tokens_used, prompt_tokens, response_tokens,
         cost_estimate, model_used, cache_hit, blocked_reason, metadata,
         feature_type, request_id, input_tokens, output_tokens, estimated_cost,
         cost_usd, cost_ngn, response_time_ms, status, prompt_hash, safety_flags
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
               $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb)
       returning *`,
      [
        id,
        log.userId || null,
        log.endpoint,
        log.tokensUsed,
        log.promptTokens,
        log.responseTokens,
        log.costEstimate,
        log.modelUsed,
        log.cacheHit || false,
        log.blockedReason || null,
        JSON.stringify(log.metadata || {}),
        log.featureType || log.endpoint,
        log.requestId || null,
        log.inputTokens ?? log.promptTokens,
        log.outputTokens ?? log.responseTokens,
        log.estimatedCost ?? log.costEstimate,
        log.costUsd ?? (Number(log.costEstimate || 0) / 100),
        log.costNgn ?? null,
        log.responseTimeMs || 0,
        log.status || (log.blockedReason ? "blocked" : log.cacheHit ? "cached" : "completed"),
        log.promptHash || null,
        JSON.stringify(log.safetyFlags || [])
      ]
    );
    await this.upsertCostSummary(rows[0], client);
    return rows[0];
  },

  async upsertCostSummary(log, client = pool) {
    const id = createId();
    await client.query(
      `insert into ai_cost_summary (
         id, period_start, period_end, feature_type, model_used, requests,
         input_tokens, output_tokens, cost_usd, cache_hits, blocked_requests,
         average_response_time_ms
       )
       values (
         $1, date_trunc('month', $2::timestamptz)::date,
         (date_trunc('month', $2::timestamptz) + interval '1 month - 1 day')::date,
         $3, $4, 1, $5, $6, $7, case when $8 then 1 else 0 end,
         case when $9 is not null then 1 else 0 end, $10
       )
       on conflict (period_start, feature_type, model_used) do update
       set requests = ai_cost_summary.requests + 1,
           input_tokens = ai_cost_summary.input_tokens + excluded.input_tokens,
           output_tokens = ai_cost_summary.output_tokens + excluded.output_tokens,
           cost_usd = ai_cost_summary.cost_usd + excluded.cost_usd,
           cache_hits = ai_cost_summary.cache_hits + excluded.cache_hits,
           blocked_requests = ai_cost_summary.blocked_requests + excluded.blocked_requests,
           average_response_time_ms = round(((ai_cost_summary.average_response_time_ms * ai_cost_summary.requests) + excluded.average_response_time_ms)::numeric / (ai_cost_summary.requests + 1))::integer,
           updated_at = now()`,
      [
        id,
        log.created_at,
        log.feature_type || log.endpoint,
        log.model_used,
        log.input_tokens || log.prompt_tokens || 0,
        log.output_tokens || log.response_tokens || 0,
        log.cost_usd || 0,
        Boolean(log.cache_hit),
        log.blocked_reason,
        log.response_time_ms || 0
      ]
    );
  },

  async dailySpendForUser(userId, client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_estimate), 0)::float as total
       from ai_usage_logs
       where user_id = $1
         and created_at >= date_trunc('day', now())
         and blocked_reason is null`,
      [userId]
    );
    return rows[0].total;
  },

  async dailyGlobalSpend(client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_estimate), 0)::float as total
       from ai_usage_logs
       where created_at >= date_trunc('day', now())
         and blocked_reason is null`
    );
    return rows[0].total;
  },

  async monthlySpendForUser(userId, client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_usd), 0)::float as cost_usd,
              coalesce(sum(tokens_used), 0)::integer as tokens_used,
              count(*) filter (where blocked_reason is null)::integer as requests
       from ai_usage_logs
       where user_id = $1
         and created_at >= date_trunc('month', now())
         and blocked_reason is null`,
      [userId]
    );
    return rows[0];
  },

  async monthlySpendForFeature(featureType, client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_usd), 0)::float as cost_usd
       from ai_usage_logs
       where feature_type = $1
         and created_at >= date_trunc('month', now())
         and blocked_reason is null`,
      [featureType]
    );
    return rows[0].cost_usd;
  },

  async monthlyGlobalSpend(client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_usd), 0)::float as cost_usd
       from ai_usage_logs
       where created_at >= date_trunc('month', now())
         and blocked_reason is null`
    );
    return rows[0].cost_usd;
  },

  async requestCountSince({ userId, since }, client = pool) {
    const { rows } = await client.query(
      `select count(*)::integer as requests
       from ai_usage_logs
       where user_id = $1
         and created_at >= $2
         and blocked_reason is null`,
      [userId, since]
    );
    return rows[0].requests;
  },

  async dailyRequestCount(userId, client = pool) {
    const { rows } = await client.query(
      `select count(*)::integer as requests
       from ai_usage_logs
       where user_id = $1
         and created_at >= date_trunc('day', now())
         and blocked_reason is null`,
      [userId]
    );
    return rows[0].requests;
  },

  async activeBudget(scope, scopeKey, client = pool) {
    const { rows } = await client.query(
      `select * from ai_budget_limits
       where scope = $1 and scope_key = $2 and active = true
       limit 1`,
      [scope, scopeKey]
    );
    return rows[0] || null;
  },

  async currentQuota(userId, client = pool) {
    const { rows } = await client.query(
      `select * from user_ai_quotas
       where user_id = $1
         and period_start <= current_date
         and period_end >= current_date
       order by created_at desc
       limit 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async upsertQuota({ userId, planCode, monthlyCostLimitUsd, monthlyTokenLimit = null, dailyRequestLimit = null, burstPerMinute = null }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into user_ai_quotas (
         id, user_id, plan_code, monthly_cost_limit_usd, monthly_token_limit,
         daily_request_limit, burst_per_minute, period_start, period_end
       )
       values (
         $1, $2, $3, $4, $5, $6, $7,
         date_trunc('month', now())::date,
         (date_trunc('month', now()) + interval '1 month - 1 day')::date
       )
       on conflict (user_id, period_start) do update
       set plan_code = excluded.plan_code,
           monthly_cost_limit_usd = excluded.monthly_cost_limit_usd,
           monthly_token_limit = excluded.monthly_token_limit,
           daily_request_limit = excluded.daily_request_limit,
           burst_per_minute = excluded.burst_per_minute,
           updated_at = now()
       returning *`,
      [id, userId, planCode, monthlyCostLimitUsd, monthlyTokenLimit, dailyRequestLimit, burstPerMinute]
    );
    return rows[0];
  },

  async findCache(cacheKey, client = pool) {
    const { rows } = await client.query(
      `update ai_cache_store
       set hits = hits + 1, last_hit_at = now()
       where cache_key = $1 and expires_at > now()
       returning *`,
      [cacheKey]
    );
    return rows[0] || null;
  },

  async storeCache({ cacheKey, promptHash, featureType, modelUsed, responseText, metadata = {}, ttlSeconds }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into ai_cache_store (id, cache_key, prompt_hash, feature_type, model_used, response_text, metadata, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, now() + ($8::text || ' seconds')::interval)
       on conflict (cache_key) do update
       set response_text = excluded.response_text,
           metadata = excluded.metadata,
           expires_at = excluded.expires_at
       returning *`,
      [id, cacheKey, promptHash, featureType, modelUsed, responseText, JSON.stringify(metadata), ttlSeconds]
    );
    return rows[0];
  },

  async summary(client = pool) {
    const { rows } = await client.query(
      `select count(*)::integer as total_requests,
              coalesce(sum(cost_usd), 0)::float as total_cost_usd,
              coalesce(sum(cost_estimate), 0)::float as total_cost,
              coalesce(sum(tokens_used), 0)::integer as total_tokens,
              coalesce(sum(input_tokens), 0)::integer as input_tokens,
              coalesce(sum(output_tokens), 0)::integer as output_tokens,
              count(*) filter (where cache_hit)::integer as cache_hits,
              count(*) filter (where blocked_reason is not null)::integer as blocked_requests,
              coalesce(round(avg(response_time_ms))::integer, 0) as average_response_time_ms
       from ai_usage_logs`
    );
    return rows[0];
  },

  async userUsage(userId, client = pool) {
    const { rows } = await client.query(
      `select endpoint,
              model_used,
              count(*)::integer as requests,
              coalesce(sum(cost_estimate), 0)::float as cost,
              coalesce(sum(tokens_used), 0)::integer as tokens
       from ai_usage_logs
       where user_id = $1
       group by endpoint, model_used
       order by cost desc`,
      [userId]
    );
    return rows;
  },

  async costs(client = pool) {
    const [modelBreakdown, expensiveQueries, featureBreakdown, topUsers, dailySpend] = await Promise.all([
      client.query(
        `select model_used,
                count(*)::integer as requests,
                coalesce(sum(cost_usd), 0)::float as cost_usd,
                coalesce(sum(tokens_used), 0)::integer as tokens
         from ai_usage_logs
         group by model_used
         order by cost_usd desc`
      ),
      client.query(
        `select id, user_id, endpoint, feature_type, model_used, tokens_used, cost_usd, response_time_ms, created_at, metadata
         from ai_usage_logs
         where blocked_reason is null
         order by cost_usd desc
         limit 10`
      ),
      client.query(
        `select feature_type,
                count(*)::integer as requests,
                coalesce(sum(cost_usd), 0)::float as cost_usd,
                coalesce(round(avg(tokens_used))::integer, 0) as average_tokens,
                count(*) filter (where cache_hit)::integer as cache_hits
         from ai_usage_logs
         where created_at >= date_trunc('month', now())
         group by feature_type
         order by cost_usd desc`
      ),
      client.query(
        `select user_id,
                count(*)::integer as requests,
                coalesce(sum(cost_usd), 0)::float as cost_usd,
                count(*) filter (where blocked_reason is not null)::integer as blocked_requests
         from ai_usage_logs
         where created_at >= date_trunc('month', now())
         group by user_id
         order by cost_usd desc
         limit 10`
      ),
      client.query(
        `select date_trunc('day', created_at)::date as day,
                coalesce(sum(cost_usd), 0)::float as cost_usd,
                count(*)::integer as requests
         from ai_usage_logs
         where created_at >= now() - interval '30 days'
         group by day
         order by day`
      )
    ]);

    return {
      modelUsageBreakdown: modelBreakdown.rows,
      mostExpensiveQueries: expensiveQueries.rows,
      featureCostBreakdown: featureBreakdown.rows,
      topAiUsers: topUsers.rows,
      dailySpend: dailySpend.rows
    };
  },

  async dashboard(client = pool) {
    const [summary, costs, globalBudget] = await Promise.all([this.summary(client), this.costs(client), this.activeBudget("system", "global", client)]);
    const monthlySpend = await this.monthlyGlobalSpend(client);
    const budgetLimit = Number(globalBudget?.monthly_cost_limit_usd || 0);
    const forecastedBurnRate = monthlySpend > 0 ? (monthlySpend / Math.max(new Date().getDate(), 1)) * 30 : 0;
    return {
      summary,
      costs,
      monthlySpendUsd: monthlySpend,
      monthlyBudgetUsd: budgetLimit,
      emergencyThrottle: Boolean(globalBudget?.emergency_throttle),
      forecastedBurnRateUsd: forecastedBurnRate,
      cacheHitRate:
        summary.total_requests > 0 ? Number(((summary.cache_hits / summary.total_requests) * 100).toFixed(2)) : 0
    };
  }
};
