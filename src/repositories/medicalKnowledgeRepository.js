import { pool } from "../config/database.js";

export const medicalKnowledgeRepository = {
  async overview(limit = 8, client = pool) {
    const [{ rows: topicRows }, { rows: termRows }, { rows: articleRows }, { rows: countRows }] = await Promise.all([
      client.query(
        `select id, title, summary, url, nih_institute as source, updated_at
         from medlineplus_topics
         order by updated_at desc
         limit $1`,
        [limit]
      ),
      client.query(
        `select id, term as title, definition as summary, source, source_url as url, updated_at
         from medical_terms
         order by updated_at desc
         limit $1`,
        [limit]
      ),
      client.query(
        `select id, title, abstract as summary, source_url as url, publication_date, updated_at
         from pubmed_articles
         order by publication_date desc, updated_at desc
         limit $1`,
        [limit]
      ),
      client.query(
        `select
          (select count(*) from medlineplus_topics) as medlineplus_topics,
          (select count(*) from medical_terms) as medlineplus_definitions,
          (select count(*) from pubmed_articles) as pubmed_articles`
      )
    ]);

    return {
      counts: countRows[0] || {},
      medlineplusTopics: topicRows,
      medlineplusDefinitions: termRows,
      pubmedArticles: articleRows
    };
  }
};
