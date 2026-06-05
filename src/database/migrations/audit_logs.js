import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists audit_logs (
      id ${id} primary key,
      actor_id ${id} null,
      actor_role varchar(40) null,
      action varchar(160) not null,
      entity_type varchar(120) null,
      entity_id varchar(120) null,
      ip_address varchar(80) null,
      user_agent varchar(500) null,
      metadata ${json} null,
      created_at datetime not null default current_timestamp,
      index idx_audit_logs_created (created_at),
      index idx_audit_logs_actor (actor_id)
    )`,
    `create table if not exists legal_policies (
      id ${id} primary key,
      policy_key varchar(120) null unique,
      slug varchar(120) null unique,
      title varchar(255) not null,
      body ${text} not null,
      version varchar(40) not null,
      effective_at datetime not null default current_timestamp,
      created_at datetime not null default current_timestamp
    )`,
    `create table if not exists legal_consents (
      id ${id} primary key,
      user_id ${id} not null,
      policy_key varchar(120) null,
      policy_slug varchar(120) null,
      policy_version varchar(40) not null,
      consented boolean not null default true,
      accepted boolean not null default true,
      ip_address varchar(80) null,
      user_agent varchar(500) null,
      created_at datetime not null default current_timestamp,
      unique key uq_legal_consents_user_policy (user_id, policy_slug, policy_version)
    )`,
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
    )`
  ]);
}
