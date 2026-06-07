import { pool } from "../../config/database.js";

function rangeWhere({ startDate, endDate }, column = "created_at", offset = 0) {
  const clauses = [];
  const params = [];
  if (startDate) {
    params.push(startDate);
    clauses.push(`${column} >= $${params.length + offset}`);
  }
  if (endDate) {
    params.push(endDate);
    clauses.push(`${column} < date_add($${params.length + offset}, interval 1 day)`);
  }
  return { sql: clauses.length ? ` and ${clauses.join(" and ")}` : "", params };
}

function percent(numerator, denominator) {
  if (!Number(denominator)) return 0;
  return Math.round((Number(numerator || 0) / Number(denominator)) * 10000) / 100;
}

export const analyticsService = {
  async dashboard({ startDate = null, endDate = null } = {}, client = pool) {
    const userRange = rangeWhere({ startDate, endDate }, "created_at");
    const paymentRange = rangeWhere({ startDate, endDate }, "created_at");
    const eventRange = rangeWhere({ startDate, endDate }, "created_at");

    const [
      totals,
      trialUsers,
      payingUsers,
      activeUsers,
      revenue,
      aiUsage,
      userGrowth,
      freeVsPaid,
      revenueOverTime,
      eventActivity,
      recentEvents,
      topEvents
    ] = await Promise.all([
      client.query(`select count(*) as total_users from users where deleted_at is null${userRange.sql}`, userRange.params),
      client.query("select count(distinct user_id) as free_trial_users from user_trials where status = 'active' and end_date > now()"),
      client.query(
        `select count(distinct user_id) as paying_users
         from subscriptions
         where status in ('active', 'trialing', 'past_due')
           and current_period_end > now()`
      ),
      client.query(
        `select count(distinct user_id) as active_users
         from user_events
         where created_at >= date_sub(now(), interval 7 day)`
      ),
      client.query(`select coalesce(sum(amount_cents), 0) as revenue_naira from payments where status = 'verified'${paymentRange.sql}`, paymentRange.params),
      client.query(`select count(*) as ai_usage_count from ai_usage_logs where status = 'completed'${eventRange.sql}`, eventRange.params),
      client.query(
        `select date(created_at) as label, count(*) as value
         from users
         where deleted_at is null${userRange.sql}
         group by date(created_at)
         order by label`,
        userRange.params
      ),
      client.query(
        `select segment, count(*) as value
         from (
           select u.id,
                  case when exists (
                    select 1 from subscriptions s
                    where s.user_id = u.id and s.status in ('active', 'trialing', 'past_due') and s.current_period_end > now()
                  ) then 'Paid' else 'Free or Trial' end as segment
           from users u
           where u.deleted_at is null
         ) segments
         group by segment`
      ),
      client.query(
        `select date(created_at) as label, coalesce(sum(amount_cents), 0) as value
         from payments
         where status = 'verified'${paymentRange.sql}
         group by date(created_at)
         order by label`,
        paymentRange.params
      ),
      client.query(
        `select event_type as label, count(*) as value
         from user_events
         where 1 = 1${eventRange.sql}
         group by event_type
         order by value desc
         limit 12`,
        eventRange.params
      ),
      client.query(
        `select ue.event_type, ue.entity_type, ue.entity_id, ue.created_at, u.email
         from user_events ue
         left join users u on u.id = ue.user_id
         where 1 = 1${eventRange.sql}
         order by ue.created_at desc
         limit 25`,
        eventRange.params
      ),
      client.query(
        `select event_type, count(*) as count
         from user_events
         where created_at >= date_sub(now(), interval 30 day)
         group by event_type
         order by count desc
         limit 10`
      )
    ]);

    const totalUsers = Number(totals.rows[0]?.total_users || 0);
    const paying = Number(payingUsers.rows[0]?.paying_users || 0);
    const trials = Number(trialUsers.rows[0]?.free_trial_users || 0);

    return {
      metrics: {
        totalUsers,
        freeTrialUsers: trials,
        payingUsers: paying,
        activeUsersLast7Days: Number(activeUsers.rows[0]?.active_users || 0),
        revenueNaira: Number(revenue.rows[0]?.revenue_naira || 0),
        aiUsageCount: Number(aiUsage.rows[0]?.ai_usage_count || 0),
        trialToPaidConversionRate: percent(paying, paying + trials)
      },
      charts: {
        userGrowth: userGrowth.rows,
        freeVsPaidUsers: freeVsPaid.rows,
        revenueOverTime: revenueOverTime.rows,
        userActivityEvents: eventActivity.rows
      },
      tables: {
        recentEvents: recentEvents.rows,
        topEvents: topEvents.rows
      },
      filters: { startDate, endDate }
    };
  }
};
