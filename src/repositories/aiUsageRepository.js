import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const aiUsageRepository = {
  async create(log, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into ai_usage_logs (
         id, user_id, endpoint, tokens_used, prompt_tokens, response_tokens,
         cost_estimate, model_used, cache_hit, blocked_reason, metadata
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        log.metadata || {}
      ]
    );
    return rows[0];
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

  async summary(client = pool) {
    const { rows } = await client.query(
      `select count(*)::integer as total_requests,
              coalesce(sum(cost_estimate), 0)::float as total_cost,
              coalesce(sum(tokens_used), 0)::integer as total_tokens,
              count(*) filter (where cache_hit)::integer as cache_hits,
              count(*) filter (where blocked_reason is not null)::integer as blocked_requests
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
    const [modelBreakdown, expensiveQueries] = await Promise.all([
      client.query(
        `select model_used,
                count(*)::integer as requests,
                coalesce(sum(cost_estimate), 0)::float as cost,
                coalesce(sum(tokens_used), 0)::integer as tokens
         from ai_usage_logs
         group by model_used
         order by cost desc`
      ),
      client.query(
        `select id, user_id, endpoint, model_used, tokens_used, cost_estimate, created_at, metadata
         from ai_usage_logs
         where blocked_reason is null
         order by cost_estimate desc
         limit 10`
      )
    ]);

    return {
      modelUsageBreakdown: modelBreakdown.rows,
      mostExpensiveQueries: expensiveQueries.rows
    };
  }
};
