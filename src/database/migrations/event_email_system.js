import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists event_logs (
      id ${id} primary key,
      type varchar(120) not null,
      user_id ${id} null,
      idempotency_key varchar(180) null,
      payload ${json} null,
      status varchar(40) not null default 'received',
      error_message ${text} null,
      processed_at datetime null,
      created_at datetime not null default current_timestamp,
      unique key uq_event_logs_idempotency (idempotency_key),
      index idx_event_logs_type_created (type, created_at),
      index idx_event_logs_user_created (user_id, created_at)
    )`,
    `create table if not exists email_logs (
      id ${id} primary key,
      email_queue_id ${id} null,
      event_log_id ${id} null,
      event_type varchar(120) null,
      recipient varchar(255) not null,
      subject varchar(255) not null,
      template_type varchar(80) not null,
      status varchar(40) not null default 'queued',
      failure_reason ${text} null,
      sent_at datetime null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      index idx_email_logs_recipient_created (recipient, created_at),
      index idx_email_logs_status_created (status, created_at),
      index idx_email_logs_event_type_created (event_type, created_at)
    )`,
    `create table if not exists notification_center (
      id ${id} primary key,
      user_id ${id} not null,
      event_log_id ${id} null,
      type varchar(80) not null,
      category varchar(40) not null default 'system',
      title varchar(255) not null,
      body ${text} null,
      delivery_channel varchar(40) not null default 'in_app',
      read_at datetime null,
      created_at datetime not null default current_timestamp,
      index idx_notification_center_user_created (user_id, created_at),
      index idx_notification_center_user_read (user_id, read_at),
      index idx_notification_center_category_created (category, created_at)
    )`
  ]);
}
