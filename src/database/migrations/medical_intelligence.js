import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists medical_embeddings (
      id ${id} primary key,
      text_hash char(64) not null,
      source_type varchar(120) not null,
      source_id ${id} null,
      source_title varchar(500) null,
      source_url varchar(900) null,
      content_text ${text} not null,
      embedding ${json} null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_medical_embeddings_hash (text_hash),
      index idx_medical_embeddings_source (source_type, source_id)
    )`
  ]);
}
