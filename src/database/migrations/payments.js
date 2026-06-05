import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists payment_attempts (
      id ${id} primary key,
      user_id ${id} not null,
      plan_id ${id} null,
      payment_id ${id} null,
      provider varchar(40) not null default 'opay',
      provider_reference varchar(160) not null,
      amount_cents int not null,
      currency varchar(12) not null default 'NGN',
      status varchar(40) not null default 'initialized',
      checkout_url varchar(900) null,
      raw_request ${json} null,
      raw_response ${json} null,
      fraud_flags ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_payment_attempt_provider_reference (provider_reference)
    )`,
    `create table if not exists payments (
      id ${id} primary key,
      user_id ${id} not null,
      plan_id ${id} null,
      payment_attempt_id ${id} null,
      provider varchar(40) not null default 'opay',
      provider_reference varchar(160) not null unique,
      provider_order_no varchar(180) null,
      purpose varchar(80) not null,
      amount_cents int not null,
      currency varchar(12) not null default 'NGN',
      status varchar(40) not null default 'pending',
      checkout_url varchar(900) null,
      failure_reason ${text} null,
      metadata ${json} null,
      fraud_flags ${json} null,
      verified_at datetime null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      index idx_payments_user_created (user_id, created_at)
    )`,
    `create table if not exists payment_transactions (
      id ${id} primary key,
      payment_id ${id} not null,
      provider varchar(40) not null default 'opay',
      provider_transaction_id varchar(180) null,
      status varchar(40) not null,
      amount_cents int not null,
      currency varchar(12) not null default 'NGN',
      raw_response ${json} null,
      created_at datetime not null default current_timestamp,
      index idx_payment_transactions_payment (payment_id),
      unique key uq_payment_transactions_provider_txn (provider, provider_transaction_id)
    )`,
    `create table if not exists payment_webhooks (
      id ${id} primary key,
      provider varchar(40) not null default 'opay',
      event_id varchar(180) null,
      event_type varchar(120) null,
      signature_valid boolean not null default false,
      payload ${json} null,
      processed_at datetime null,
      provider_reference varchar(160) null,
      signature varchar(500) null,
      replay_key varchar(255) null,
      status varchar(40) not null default 'received',
      created_at datetime not null default current_timestamp,
      unique key uq_payment_webhook_replay (provider, replay_key)
    )`,
    `create table if not exists refunds (
      id ${id} primary key,
      payment_id ${id} not null,
      provider_refund_id varchar(180) null,
      amount_cents int not null,
      currency varchar(12) not null default 'NGN',
      reason ${text} null,
      status varchar(40) not null default 'processing',
      raw_response ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      index idx_refunds_payment (payment_id)
    )`,
    `create table if not exists billing_events (
      id ${id} primary key,
      user_id ${id} null,
      subscription_id ${id} null,
      payment_id ${id} null,
      event_type varchar(120) not null,
      provider_reference varchar(160) null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      index idx_billing_events_user (user_id, created_at)
    )`
  ]);
}
