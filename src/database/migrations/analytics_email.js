import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists user_events (
      id ${id} primary key,
      user_id ${id} null,
      session_id ${id} null,
      event_type varchar(80) not null,
      entity_type varchar(80) null,
      entity_id ${id} null,
      ip_address varchar(80) null,
      user_agent varchar(500) null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      index idx_user_events_type_created (event_type, created_at),
      index idx_user_events_user_created (user_id, created_at),
      index idx_user_events_session_created (session_id, created_at)
    )`,
    `create table if not exists user_sessions (
      id ${id} primary key,
      user_id ${id} not null,
      refresh_token_id ${id} null,
      ip_address varchar(80) null,
      user_agent varchar(500) null,
      started_at datetime not null default current_timestamp,
      last_seen_at datetime not null default current_timestamp,
      ended_at datetime null,
      metadata ${json} null,
      index idx_user_sessions_user_started (user_id, started_at),
      index idx_user_sessions_last_seen (last_seen_at)
    )`,
    `create table if not exists email_queue (
      id ${id} primary key,
      recipient varchar(255) not null,
      subject varchar(255) not null,
      template_type varchar(80) not null,
      payload ${json} null,
      html ${text} null,
      text_body ${text} null,
      status varchar(40) not null default 'queued',
      attempts int not null default 0,
      last_error ${text} null,
      scheduled_at datetime not null default current_timestamp,
      sent_at datetime null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      index idx_email_queue_status_scheduled (status, scheduled_at),
      index idx_email_queue_recipient_created (recipient, created_at)
    )`
  ]);
}
