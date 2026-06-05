import { executeStatements, id, json, text, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists subscription_plans (
      id ${id} primary key,
      code varchar(80) not null unique,
      name varchar(160) not null,
      description ${text} null,
      interval_unit varchar(20) null,
      \`interval\` varchar(20) null,
      price_cents int not null default 0,
      currency varchar(12) not null default 'NGN',
      features ${json} null,
      report_analysis_limit int null,
      ai_chat_limit int null,
      doctor_consultations_enabled boolean not null default false,
      health_trends_enabled boolean not null default false,
      priority_processing_enabled boolean not null default false,
      advanced_ai_enabled boolean not null default false,
      active boolean not null default true,
      created_at datetime not null default current_timestamp
    )`,
    `create table if not exists subscriptions (
      id ${id} primary key,
      user_id ${id} not null,
      plan_id ${id} not null,
      status varchar(40) not null default 'active',
      started_at datetime not null default current_timestamp,
      current_period_start datetime not null default current_timestamp,
      current_period_end datetime not null,
      cancel_at_period_end boolean not null default false,
      cancelled_at datetime null,
      ${timestamps()},
      index idx_subscriptions_user_status (user_id, status)
    )`,
    `create table if not exists entitlements (
      id ${id} primary key,
      user_id ${id} not null,
      subscription_id ${id} null,
      feature varchar(80) not null,
      enabled boolean not null default true,
      limit_value int null,
      source varchar(40) not null default 'subscription',
      period_start date not null,
      period_end date not null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_entitlements_user_feature_source (user_id, feature, source)
    )`,
    `create table if not exists usage_tracking (
      id ${id} primary key,
      user_id ${id} not null,
      feature varchar(80) not null,
      period_start date not null,
      period_end date not null,
      used_count int not null default 0,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_usage_tracking_period (user_id, feature, period_start)
    )`
  ]);
}
