import { executeStatements, id, json, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists users (
      id ${id} primary key,
      email varchar(255) not null unique,
      password_hash varchar(255) not null,
      first_name varchar(120) not null,
      last_name varchar(120) not null,
      role varchar(40) not null default 'Patient',
      status varchar(40) not null default 'active',
      metadata ${json} null,
      consent_prompt_learning boolean not null default false,
      email_verified_at datetime null,
      password_reset_token_hash varchar(255) null,
      password_reset_expires_at datetime null,
      ${timestamps()},
      index idx_users_role (role),
      index idx_users_status (status)
    )`,
    `create table if not exists refresh_tokens (
      id ${id} primary key,
      user_id ${id} not null,
      token_hash varchar(255) not null,
      expires_at datetime not null,
      revoked_at datetime null,
      created_at datetime not null default current_timestamp,
      index idx_refresh_tokens_user (user_id),
      constraint fk_refresh_tokens_user foreign key (user_id) references users(id) on delete cascade
    )`
  ]);
}
