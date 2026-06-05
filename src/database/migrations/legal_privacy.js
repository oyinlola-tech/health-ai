import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists consent_records (
      id ${id} primary key,
      user_id ${id} not null,
      consent_type varchar(80) not null,
      granted boolean not null,
      action varchar(40) not null,
      ip_address varchar(80) null,
      user_agent varchar(500) null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      index idx_consent_records_user_created (user_id, created_at),
      index idx_consent_records_type (consent_type, granted)
    )`,
    `create table if not exists consent_status (
      id ${id} primary key,
      user_id ${id} not null,
      consent_type varchar(80) not null,
      granted boolean not null default false,
      last_record_id ${id} null,
      granted_at datetime null,
      revoked_at datetime null,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_consent_status_user_type (user_id, consent_type),
      index idx_consent_status_user (user_id)
    )`,
    `create table if not exists application_reviews (
      id ${id} primary key,
      application_id ${id} not null,
      reviewed_by ${id} not null,
      status varchar(40) not null,
      notes ${text} null,
      created_at datetime not null default current_timestamp,
      index idx_application_reviews_application (application_id)
    )`
  ]);
}

