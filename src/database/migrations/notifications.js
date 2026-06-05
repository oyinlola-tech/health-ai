import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists notifications (
      id ${id} primary key,
      user_id ${id} not null,
      type varchar(80) not null,
      title varchar(255) not null,
      body ${text} null,
      read_at datetime null,
      created_at datetime not null default current_timestamp,
      index idx_notifications_user_created (user_id, created_at)
    )`,
    `create table if not exists notification_events (
      id ${id} primary key,
      notification_id ${id} null,
      user_id ${id} not null,
      type varchar(80) not null,
      payload ${json} null,
      pushed_at datetime null,
      read_at datetime null,
      cleared_at datetime null,
      created_at datetime not null default current_timestamp,
      index idx_notification_events_user (user_id, created_at)
    )`,
    `create table if not exists presence_logs (
      id ${id} primary key,
      user_id ${id} not null,
      socket_id varchar(180) not null,
      status varchar(40) not null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      index idx_presence_logs_user (user_id, created_at)
    )`
  ]);
}
