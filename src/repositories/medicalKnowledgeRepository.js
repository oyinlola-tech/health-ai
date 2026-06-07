import { pool } from "../config/database.js";

function searchTokens(query) {
  return String(query || "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 1) || [];
}

function searchStem(token) {
  if (token.endsWith("ology") && token.length > 6) return token.slice(0, -1);
  if (token.endsWith("ies") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("s") && token.length > 5) return token.slice(0, -1);
  return token;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkup(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function matchesMedicalTerm(row, tokens) {
  const text = `${row.title || ""} ${row.summary || ""} ${row.source || ""}`.toLowerCase();
  const cleanText = stripMarkup(text);
  return tokens.every((token) => {
    const stem = searchStem(token);
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(stem)}`).test(cleanText);
  });
}

function resultScore(row, tokens) {
  const title = String(row.title || "").toLowerCase();
  if (tokens.some((token) => title === token)) return 0;
  if (tokens.some((token) => title.startsWith(searchStem(token)))) return 1;
  return 2;
}

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
    const tokens = searchTokens(term);
    if (!tokens.length) return [];

    const primaryStem = searchStem(tokens[0]);
    const like = `%${primaryStem}%`;
    const prefix = `${primaryStem}%`;
    const candidateLimit = Math.max(limit * 4, 24);
    const [{ rows: topicRows }, { rows: termRows }, { rows: articleRows }] = await Promise.all([
      client.query(
        `select id, 'MedlinePlus topic' as type, title, summary, nih_institute as source, url, updated_at
         from medlineplus_topics
         where title like $1 or summary like $1 or nih_institute like $1
         order by case when title like $2 then 0 else 1 end, updated_at desc
         limit $3`,
        [like, prefix, candidateLimit]
      ),
      client.query(
        `select id, 'MedlinePlus definition' as type, term as title, definition as summary, source, source_url as url, updated_at
         from medical_terms
         where term like $1 or definition like $1 or source like $1
         order by case when term like $2 then 0 else 1 end, updated_at desc
         limit $3`,
        [like, prefix, candidateLimit]
      ),
      client.query(
        `select id, 'PubMed article' as type, title, abstract as summary, 'PubMed' as source, source_url as url, publication_date, updated_at
         from pubmed_articles
         where title like $1 or abstract like $1
         order by case when title like $2 then 0 else 1 end, publication_date desc, updated_at desc
         limit $3`,
        [like, prefix, candidateLimit]
      )
    ]);

    return [...topicRows, ...termRows, ...articleRows]
      .filter((row) => matchesMedicalTerm(row, tokens))
      .sort((left, right) => resultScore(left, tokens) - resultScore(right, tokens))
      .slice(0, limit);
  }
};
