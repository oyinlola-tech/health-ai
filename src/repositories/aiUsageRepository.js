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
         cost_ngn, response_time_ms, status, prompt_hash, safety_flags
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
               $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb)
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
        log.costNaira ?? log.costEstimate ?? 0,
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
         input_tokens, output_tokens, cost_ngn, cache_hits, blocked_requests,
         average_response_time_ms
       )
       values (
         $1, date_format($2, '%Y-%m-01'),
         last_day($2),
         $3, $4, 1, $5, $6, $7, case when $8 then 1 else 0 end,
         case when $9 is not null then 1 else 0 end, $10
       )
       on duplicate key update
           requests = requests + 1,
           input_tokens = input_tokens + values(input_tokens),
           output_tokens = output_tokens + values(output_tokens),
           cost_ngn = cost_ngn + values(cost_ngn),
           cache_hits = cache_hits + values(cache_hits),
           blocked_requests = blocked_requests + values(blocked_requests),
           average_response_time_ms = round(((average_response_time_ms * requests) + values(average_response_time_ms)) / (requests + 1)),
           updated_at = now()`,
      [
        id,
        log.created_at,
        log.feature_type || log.endpoint,
        log.model_used,
        log.input_tokens || log.prompt_tokens || 0,
        log.output_tokens || log.response_tokens || 0,
        log.cost_ngn || 0,
        Boolean(log.cache_hit),
        log.blocked_reason,
        log.response_time_ms || 0
      ]
    );
  },

  async dailySpendForUser(userId, client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_estimate), 0) as total
       from ai_usage_logs
       where user_id = $1
         and created_at >= current_date
         and blocked_reason is null`,
      [userId]
    );
    return rows[0].total;
  },

  async dailyGlobalSpend(client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_estimate), 0) as total
       from ai_usage_logs
       where created_at >= current_date
         and blocked_reason is null`
    );
    return rows[0].total;
  },

  async monthlySpendForUser(userId, client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_ngn), 0) as cost_ngn,
              coalesce(sum(tokens_used), 0) as tokens_used,
              sum(case when blocked_reason is null then 1 else 0 end) as requests
       from ai_usage_logs
       where user_id = $1
         and created_at >= date_format(current_date, '%Y-%m-01')
         and blocked_reason is null`,
      [userId]
    );
    return rows[0];
  },

  async monthlySpendForFeature(featureType, client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_ngn), 0) as cost_ngn
       from ai_usage_logs
       where feature_type = $1
         and created_at >= date_format(current_date, '%Y-%m-01')
         and blocked_reason is null`,
      [featureType]
    );
    return rows[0].cost_ngn;
  },

  async monthlyGlobalSpend(client = pool) {
    const { rows } = await client.query(
      `select coalesce(sum(cost_ngn), 0) as cost_ngn
       from ai_usage_logs
       where created_at >= date_format(current_date, '%Y-%m-01')
         and blocked_reason is null`
    );
    return rows[0].cost_ngn;
  },

  async requestCountSince({ userId, since }, client = pool) {
    const { rows } = await client.query(
      `select count(*) as requests
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
      `select count(*) as requests
       from ai_usage_logs
       where user_id = $1
         and created_at >= current_date
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

  async upsertQuota({ userId, planCode, monthlyCostLimitNaira, monthlyTokenLimit = null, dailyRequestLimit = null, burstPerMinute = null }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into user_ai_quotas (
         id, user_id, plan_code, monthly_cost_limit_ngn, monthly_token_limit,
         daily_request_limit, burst_per_minute, period_start, period_end
       )
       values (
         $1, $2, $3, $4, $5, $6, $7,
         date_format(current_date, '%Y-%m-01'),
         last_day(current_date)
       )
       on duplicate key update
           plan_code = values(plan_code),
           monthly_cost_limit_ngn = values(monthly_cost_limit_ngn),
           monthly_token_limit = values(monthly_token_limit),
           daily_request_limit = values(daily_request_limit),
           burst_per_minute = values(burst_per_minute),
           updated_at = now()
       returning *`,
      [id, userId, planCode, monthlyCostLimitNaira, monthlyTokenLimit, dailyRequestLimit, burstPerMinute]
    );
    if (rows[0]) return rows[0];
    const updated = await client.query(
      `select * from user_ai_quotas
       where user_id = $1
         and period_start <= current_date
         and period_end >= current_date
       order by updated_at desc
       limit 1`,
      [userId]
    );
    return updated.rows[0] || null;
  },

  async findCache(cacheKey, client = pool) {
    await client.query(
      `update ai_cache_store
       set hits = hits + 1, last_hit_at = now()
       where cache_key = $1 and expires_at > now()`,
      [cacheKey]
    );
    const { rows } = await client.query("select * from ai_cache_store where cache_key = $1 and expires_at > now() limit 1", [cacheKey]);
    return rows[0] || null;
  },

  async storeCache({ cacheKey, promptHash, featureType, modelUsed, responseText, metadata = {}, ttlSeconds }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into ai_cache_store (id, cache_key, prompt_hash, feature_type, model_used, response_text, metadata, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, date_add(now(), interval $8 second))
       on duplicate key update
           response_text = values(response_text),
           metadata = values(metadata),
           expires_at = values(expires_at)
       returning *`,
      [id, cacheKey, promptHash, featureType, modelUsed, responseText, JSON.stringify(metadata), ttlSeconds]
    );
    return rows[0];
  },

  async summary(client = pool) {
    const { rows } = await client.query(
      `select count(*) as total_requests,
              coalesce(sum(cost_ngn), 0) as total_cost_ngn,
              coalesce(sum(cost_estimate), 0) as total_cost,
              coalesce(sum(tokens_used), 0) as total_tokens,
              coalesce(sum(input_tokens), 0) as input_tokens,
              coalesce(sum(output_tokens), 0) as output_tokens,
              sum(case when cache_hit then 1 else 0 end) as cache_hits,
              sum(case when json_unquote(json_extract(metadata, '$.ragGrounded')) = 'true' then 1 else 0 end) as rag_hits,
              sum(case when status = 'failover' or blocked_reason = 'model_failover' then 1 else 0 end) as failovers,
              sum(case when blocked_reason is not null then 1 else 0 end) as blocked_requests,
              coalesce(round(avg(response_time_ms)), 0) as average_response_time_ms
       from ai_usage_logs`
    );
    return rows[0];
  },

  async userUsage(userId, client = pool) {
    const { rows } = await client.query(
      `select endpoint,
              model_used,
              count(*) as requests,
              coalesce(sum(cost_estimate), 0) as cost,
              coalesce(sum(tokens_used), 0) as tokens
       from ai_usage_logs
       where user_id = $1
       group by endpoint, model_used
       order by cost desc`,
      [userId]
    );
    return rows;
  },

  async costs(client = pool) {
    const [modelBreakdown, expensiveQueries, featureBreakdown, topUsers, dailySpend, cacheLevels] = await Promise.all([
      client.query(
        `select model_used,
                count(*) as requests,
                coalesce(sum(cost_ngn), 0) as cost_ngn,
                coalesce(sum(tokens_used), 0) as tokens,
                sum(case when cache_hit then 1 else 0 end) as cache_hits,
                sum(case when status = 'failover' or blocked_reason = 'model_failover' then 1 else 0 end) as failovers,
                coalesce(round(avg(response_time_ms)), 0) as average_latency_ms
         from ai_usage_logs
         group by model_used
         order by cost_ngn desc`
      ),
      client.query(
        `select id, user_id, endpoint, feature_type, model_used, tokens_used, cost_ngn, response_time_ms, created_at, metadata
         from ai_usage_logs
         where blocked_reason is null
         order by cost_ngn desc
         limit 10`
      ),
      client.query(
        `select feature_type,
                count(*) as requests,
                coalesce(sum(cost_ngn), 0) as cost_ngn,
                coalesce(round(avg(tokens_used)), 0) as average_tokens,
                sum(case when cache_hit then 1 else 0 end) as cache_hits,
                sum(case when json_unquote(json_extract(metadata, '$.ragGrounded')) = 'true' then 1 else 0 end) as rag_hits,
                sum(case when status = 'failover' or blocked_reason = 'model_failover' then 1 else 0 end) as failovers
         from ai_usage_logs
         where created_at >= date_format(current_date, '%Y-%m-01')
         group by feature_type
         order by cost_ngn desc`
      ),
      client.query(
        `select user_id,
                count(*) as requests,
                coalesce(sum(cost_ngn), 0) as cost_ngn,
                sum(case when blocked_reason is not null then 1 else 0 end) as blocked_requests
         from ai_usage_logs
         where created_at >= date_format(current_date, '%Y-%m-01')
         group by user_id
         order by cost_ngn desc
         limit 10`
      ),
      client.query(
        `select date(created_at) as day,
                coalesce(sum(cost_ngn), 0) as cost_ngn,
                count(*) as requests
         from ai_usage_logs
         where created_at >= date_sub(now(), interval 30 day)
         group by day
         order by day`
      ),
      client.query(
        `select coalesce(json_unquote(json_extract(metadata, '$.cacheLevel')), 'unknown') as cache_level,
                count(*) as requests,
                sum(case when cache_hit then 1 else 0 end) as hits
         from ai_usage_logs
         group by cache_level
         order by cache_level`
      )
    ]);

    return {
      modelUsageBreakdown: modelBreakdown.rows,
      mostExpensiveQueries: expensiveQueries.rows,
      featureCostBreakdown: featureBreakdown.rows,
      topAiUsers: topUsers.rows,
      dailySpend: dailySpend.rows,
      cacheLevels: cacheLevels.rows
    };
  },

  async dashboard(client = pool) {
    const [summary, costs, globalBudget] = await Promise.all([this.summary(client), this.costs(client), this.activeBudget("system", "global", client)]);
    const monthlySpend = await this.monthlyGlobalSpend(client);
    const budgetLimit = Number(globalBudget?.monthly_cost_limit_ngn || 0);
    const forecastedBurnRate = monthlySpend > 0 ? (monthlySpend / Math.max(new Date().getDate(), 1)) * 30 : 0;
    return {
      summary,
      costs,
      monthlySpendNaira: monthlySpend,
      monthlyBudgetNaira: budgetLimit,
      emergencyThrottle: Boolean(globalBudget?.emergency_throttle),
      forecastedBurnRateNaira: forecastedBurnRate,
      cacheHitRate:
        summary.total_requests > 0 ? Number(((summary.cache_hits / summary.total_requests) * 100).toFixed(2)) : 0,
      ragHitRate:
        summary.total_requests > 0 ? Number(((summary.rag_hits / summary.total_requests) * 100).toFixed(2)) : 0
    };
  }
};
