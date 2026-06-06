import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists pricing_plans (
      id ${id} primary key,
      code varchar(80) not null unique,
      tier varchar(40) not null,
      name varchar(160) not null,
      description ${text} null,
      price_naira int not null default 0,
      currency varchar(12) not null default 'NGN',
      interval_unit varchar(20) not null default 'month',
      report_analysis_limit int null,
      ai_chat_limit int null,
      doctor_consultations_enabled boolean not null default false,
      premium_rag_enabled boolean not null default false,
      priority_processing_enabled boolean not null default false,
      entitlements ${json} null,
      active boolean not null default true,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      index idx_pricing_plans_tier (tier),
      index idx_pricing_plans_active (active)
    )`
  ]);
}
