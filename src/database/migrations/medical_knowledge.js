import { executeStatements, id, json, text, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists medlineplus_topics (
      id ${id} primary key,
      medlineplus_id varchar(80) null,
      title varchar(500) not null,
      summary ${text} null,
      url varchar(900) not null,
      related_topics ${json} null,
      nih_institute varchar(500) null,
      language varchar(80) not null,
      categories ${json} null,
      source_url varchar(900) not null,
      source_generated_at varchar(120) null,
      ${timestamps()},
      unique key uq_medlineplus_topics_url (url(500)),
      index idx_medlineplus_topics_language (language),
      index idx_medlineplus_topics_title (title)
    )`,
    `create table if not exists medical_terms (
      id ${id} primary key,
      term varchar(500) not null,
      definition ${text} not null,
      source varchar(500) null,
      source_url varchar(900) null,
      category varchar(120) null,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_medical_terms_term_source_category (term(180), source(120), category),
      index idx_medical_terms_term (term)
    )`
  ]);
}
