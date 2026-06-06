import { executeStatements, id, json, text } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists pubmed_articles (
      id ${id} primary key,
      pmid varchar(32) not null,
      title varchar(1200) not null,
      abstract ${text} null,
      publication_date date null,
      publication_date_text varchar(120) null,
      authors ${json} null,
      keywords ${json} null,
      query_terms ${json} null,
      source_query ${text} null,
      source_url varchar(900) not null,
      fetched_at datetime not null default current_timestamp,
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_pubmed_articles_pmid (pmid),
      index idx_pubmed_articles_publication_date (publication_date),
      index idx_pubmed_articles_title (title(191))
    )`
  ]);
}
