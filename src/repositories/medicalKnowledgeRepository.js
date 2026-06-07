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
  },

  async search(query, limit = 12, client = pool) {
    const term = String(query || "").trim();
    if (!term) return [];

    const like = `%${term}%`;
    const perSourceLimit = Math.max(1, Math.ceil(limit / 3));
    const [{ rows: topicRows }, { rows: termRows }, { rows: articleRows }] = await Promise.all([
      client.query(
        `select id, 'MedlinePlus topic' as type, title, summary, nih_institute as source, url, updated_at
         from medlineplus_topics
         where title like $1 or summary like $1 or nih_institute like $1
         order by case when title like $2 then 0 else 1 end, updated_at desc
         limit $3`,
        [like, `${term}%`, perSourceLimit]
      ),
      client.query(
        `select id, 'MedlinePlus definition' as type, term as title, definition as summary, source, source_url as url, updated_at
         from medical_terms
         where term like $1 or definition like $1 or source like $1
         order by case when term like $2 then 0 else 1 end, updated_at desc
         limit $3`,
        [like, `${term}%`, perSourceLimit]
      ),
      client.query(
        `select id, 'PubMed article' as type, title, abstract as summary, 'PubMed' as source, source_url as url, publication_date, updated_at
         from pubmed_articles
         where title like $1 or abstract like $1
         order by case when title like $2 then 0 else 1 end, publication_date desc, updated_at desc
         limit $3`,
        [like, `${term}%`, perSourceLimit]
      )
    ]);

    return [...topicRows, ...termRows, ...articleRows].slice(0, limit);
  }
};
