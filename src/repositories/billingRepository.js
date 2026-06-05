import { pool } from "../config/database.js";
import { createId } from "../utils/uuid.js";

export const billingRepository = {
  async listPlans(client = pool) {
    const { rows } = await client.query("select * from subscription_plans where active = true order by price_cents asc");
    return rows;
  },

  async findPlanByCode(code, client = pool) {
    const { rows } = await client.query("select * from subscription_plans where code = $1 and active = true", [code]);
    return rows[0] || null;
  },

  async currentSubscription(userId, client = pool) {
    const { rows } = await client.query(
      `select s.*, sp.code as plan_code, sp.name as plan_name, sp.features,
              sp.report_analysis_limit, sp.ai_chat_limit,
              sp.doctor_consultations_enabled, sp.health_trends_enabled,
              sp.priority_processing_enabled, sp.advanced_ai_enabled
       from subscriptions s
       join subscription_plans sp on sp.id = s.plan_id
       where s.user_id = $1
         and s.status in ('active', 'trialing', 'past_due')
       order by s.created_at desc
       limit 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async createPaymentAttempt({ userId, planId, providerReference, amountCents, currency, rawRequest }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into payment_attempts (id, user_id, plan_id, provider_reference, amount_cents, currency, raw_request)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       returning *`,
      [id, userId, planId, providerReference, amountCents, currency, JSON.stringify(rawRequest || {})]
    );
    return rows[0];
  },

  async createPayment({ userId, planId, attemptId, providerReference, amountCents, currency, checkoutUrl = null }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into payments (id, user_id, plan_id, payment_attempt_id, provider, provider_reference, purpose, amount_cents, currency, status, checkout_url)
       values ($1, $2, $3, $4, 'opay', $5, 'premium_subscription', $6, $7, 'pending', $8)
       returning *`,
      [id, userId, planId, attemptId, providerReference, amountCents, currency, checkoutUrl]
    );
    return rows[0];
  },

  async attachPaymentToAttempt({ attemptId, paymentId, checkoutUrl, rawResponse }, client = pool) {
    const { rows } = await client.query(
      `update payment_attempts
       set payment_id = $2,
           checkout_url = $3,
           raw_response = $4::jsonb,
           status = 'redirected',
           updated_at = now()
       where id = $1
       returning *`,
      [attemptId, paymentId, checkoutUrl, JSON.stringify(rawResponse || {})]
    );
    return rows[0] || null;
  },

  async findPaymentByReference(providerReference, client = pool) {
    const { rows } = await client.query(
      `select p.*, sp.code as plan_code, sp.\`interval\` as plan_interval
       from payments p
       left join subscription_plans sp on sp.id = p.plan_id
       where p.provider_reference = $1`,
      [providerReference]
    );
    return rows[0] || null;
  },

  async updatePaymentStatus({ providerReference, status, providerOrderNo = null, failureReason = null, rawResponse = null }, client = pool) {
    const { rows } = await client.query(
      `update payments
       set status = $2,
           provider_order_no = coalesce($3, provider_order_no),
           failure_reason = coalesce($4, failure_reason),
           metadata = case when $5 is null then metadata else json_merge_patch(coalesce(metadata, json_object()), json_object('verification', cast($5 as json))) end,
           verified_at = case when $2 = 'verified' then coalesce(verified_at, now()) else verified_at end,
           updated_at = now()
       where provider_reference = $1
       returning *`,
      [providerReference, status, providerOrderNo, failureReason, rawResponse ? JSON.stringify(rawResponse) : null]
    );
    return rows[0] || null;
  },

  async flagPaymentFraud({ paymentId, providerReference = null, flags = [] }, client = pool) {
    const { rows } = await client.query(
      `update payments
       set fraud_flags = $2,
           metadata = json_merge_patch(coalesce(metadata, json_object()), json_object('fraudFlags', cast($2 as json))),
           updated_at = now()
       where id = $1
       returning *`,
      [paymentId, JSON.stringify(flags)]
    );
    await this.createBillingEvent({
      userId: rows[0]?.user_id || null,
      paymentId,
      eventType: "payment.fraud_flagged",
      providerReference,
      metadata: { flags }
    }, client);
    return rows[0] || null;
  },

  async activateSubscription({ userId, planId, interval, paymentId }, client = pool) {
    const periodEndExpression = interval === "year" ? "date_add(now(), interval 1 year)" : "date_add(now(), interval 1 month)";
    await client.query("update subscriptions set status = 'expired', updated_at = now() where user_id = $1 and status in ('active', 'trialing', 'past_due')", [
      userId
    ]);
    const id = createId();
    const { rows } = await client.query(
      `insert into subscriptions (id, user_id, plan_id, status, started_at, current_period_start, current_period_end)
       values ($1, $2, $3, 'active', now(), now(), ${periodEndExpression})
       returning *`,
      [id, userId, planId]
    );
    await this.createBillingEvent({ userId, subscriptionId: id, paymentId, eventType: "subscription.activated" }, client);
    return rows[0];
  },

  async cancelSubscription({ userId, subscriptionId }, client = pool) {
    const { rows } = await client.query(
      `update subscriptions
       set status = 'cancelled',
           cancel_at_period_end = false,
           cancelled_at = now(),
           updated_at = now()
       where id = $1 and user_id = $2 and status in ('active', 'trialing', 'past_due')
       returning *`,
      [subscriptionId, userId]
    );
    if (rows[0]) await this.createBillingEvent({ userId, subscriptionId, eventType: "subscription.cancelled" }, client);
    return rows[0] || null;
  },

  async upsertEntitlements({ userId, subscriptionId, plan }, client = pool) {
    const features = [
      ["REPORT_ANALYSIS", true, plan.report_analysis_limit],
      ["AI_CHAT", true, plan.ai_chat_limit],
      ["DOCTOR_CONSULTATION", plan.doctor_consultations_enabled, null],
      ["HEALTH_TREND_ANALYTICS", plan.health_trends_enabled, null],
      ["PRIORITY_PROCESSING", plan.priority_processing_enabled, null],
      ["ADVANCED_AI_EXPLANATIONS", plan.advanced_ai_enabled, null]
    ];

    for (const [feature, enabled, limit] of features) {
      await client.query(
        `insert into entitlements (id, user_id, subscription_id, feature, enabled, limit_value, source, period_start, period_end)
         values ($1, $2, $3, $4, $5, $6, 'subscription', date_format(current_date, '%Y-%m-01'), date_add(date_format(current_date, '%Y-%m-01'), interval 1 month))
         on duplicate key update
             subscription_id = values(subscription_id),
             enabled = values(enabled),
             limit_value = values(limit_value),
             period_start = values(period_start),
             period_end = values(period_end),
             updated_at = now()`,
        [createId(), userId, subscriptionId, feature, enabled, limit]
      );
    }
  },

  async usageForUser(userId, client = pool) {
    const { rows } = await client.query(
      `select * from usage_tracking
       where user_id = $1 and period_start = date_format(current_date, '%Y-%m-01')
       order by feature`,
      [userId]
    );
    return rows;
  },

  async incrementUsage({ userId, feature, metadata = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into usage_tracking (id, user_id, feature, period_start, period_end, used_count, metadata)
       values ($1, $2, $3, date_format(current_date, '%Y-%m-01'), last_day(current_date), 1, $4)
       on duplicate key update
           used_count = used_count + 1,
           metadata = json_merge_patch(coalesce(metadata, json_object()), coalesce(values(metadata), json_object())),
           updated_at = now()
       returning *`,
      [id, userId, feature, JSON.stringify(metadata)]
    );
    return rows[0];
  },

  async createBillingEvent({ userId = null, subscriptionId = null, paymentId = null, eventType, providerReference = null, metadata = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into billing_events (id, user_id, subscription_id, payment_id, event_type, provider_reference, metadata)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       returning *`,
      [id, userId, subscriptionId, paymentId, eventType, providerReference, JSON.stringify(metadata)]
    );
    return rows[0];
  },

  async createPaymentTransaction({ paymentId, status, amountCents, currency, providerTransactionId = null, rawResponse = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into payment_transactions (id, payment_id, provider, provider_transaction_id, status, amount_cents, currency, raw_response)
       values ($1, $2, 'opay', $3, $4, $5, $6, $7::jsonb)
       returning *`,
      [id, paymentId, providerTransactionId, status, amountCents, currency, JSON.stringify(rawResponse)]
    );
    return rows[0];
  },

  async findPaymentTransaction(providerTransactionId, client = pool) {
    if (!providerTransactionId) return null;
    const { rows } = await client.query(
      "select * from payment_transactions where provider = 'opay' and provider_transaction_id = $1 limit 1",
      [providerTransactionId]
    );
    return rows[0] || null;
  },

  async billingHistory(userId, client = pool) {
    const { rows } = await client.query(
      `select id, provider, provider_reference, purpose, amount_cents, currency, status, checkout_url, provider_order_no, created_at, updated_at
       from payments
       where user_id = $1
       order by created_at desc`,
      [userId]
    );
    return rows;
  },

  async createRefund({ paymentId, reason, amountCents, providerRefundId = null, rawResponse = {} }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into refunds (id, payment_id, provider_refund_id, amount_cents, currency, reason, status, raw_response)
       select $1, id, $2, $3, currency, $4, 'processing', $5::jsonb
       from payments
       where id = $6
       returning *`,
      [id, providerRefundId, amountCents, reason, JSON.stringify(rawResponse), paymentId]
    );
    return rows[0] || null;
  },

  async adminMetrics(client = pool) {
    const { rows } = await client.query(
      `select
         coalesce((select sum(amount_cents) from payments where status = 'verified' and created_at >= date_format(current_date, '%Y-%m-01')), 0) as monthly_revenue_cents,
         count(distinct case when status in ('active', 'trialing', 'past_due') then user_id end) as active_subscribers,
         coalesce((select count(*) from payments where status = 'failed' and created_at >= date_format(current_date, '%Y-%m-01')), 0) as failed_payments,
         coalesce((select count(*) from refunds where created_at >= date_format(current_date, '%Y-%m-01')), 0) as refunds,
         coalesce((select round(sum(case when status = 'cancelled' then 1 else 0 end) / nullif(count(*), 0) * 100, 2) from subscriptions), 0) as churn_rate,
         coalesce((select round(sum(case when status in ('processing', 'succeeded') then 1 else 0 end) / nullif((select count(*) from payments where status = 'verified'), 0) * 100, 2) from refunds), 0) as refund_rate
       from subscriptions`
    );
    const features = await client.query(
      `select feature, sum(used_count)::int as used_count
       from usage_tracking
       where period_start = date_format(current_date, '%Y-%m-01')
       group by feature
       order by used_count desc
       limit 10`
    );
    return { ...rows[0], top_features_used: features.rows };
  },

  async recordWebhook({ eventId, eventType, payload, signature, replayKey, signatureValid, providerReference }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into payment_webhooks (id, provider, event_id, event_type, signature_valid, payload, processed_at, provider_reference, signature, replay_key, status)
       values ($1, 'opay', $2, $3, $4, $5, now(), $6, $7, $8, $9)
       on duplicate key update id = id
       returning *`,
      [id, eventId, eventType, signatureValid, JSON.stringify(payload), providerReference, signature, replayKey, signatureValid ? "received" : "rejected"]
    );
    return rows[0] || null;
  }
};
