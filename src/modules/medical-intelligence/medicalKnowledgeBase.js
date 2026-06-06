import { pool } from "../../config/database.js";

function likePattern(query) {
  return `%${String(query || "")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join("%")}%`;
}

function normalizeSource(row, sourceType) {
  return {
    id: row.id,
    sourceType,
    title: row.title || row.term || row.display_name || row.standard_name || row.dataset_name || "Medical source",
    summary: row.summary || row.definition || row.explanation || row.abstract || row.description || "",
    url: row.url || row.source_url || row.dataset_url || null,
    source: row.source || row.dataset_author || sourceType,
    metadata: row.metadata || {}
  };
}

export const medicalKnowledgeBase = {
  async searchMedlinePlus(query, { limit = 5 } = {}, client = pool) {
    const pattern = likePattern(query);
    const { rows } = await client.query(
      `select id, title, summary, url, source_url, nih_institute as source
       from medlineplus_topics
       where title like $1 or summary like $1 or cast(categories as char) like $1 or cast(related_topics as char) like $1
       order by updated_at desc
       limit $2`,
      [pattern, limit]
    );
    return rows.map((row) => normalizeSource(row, "MedlinePlus"));
  },

  async searchMedicalTerms(query, { limit = 5 } = {}, client = pool) {
    const pattern = likePattern(query);
    const { rows } = await client.query(
      `select id, term, definition, source, source_url
       from medical_terms
       where term like $1 or definition like $1
       order by updated_at desc
       limit $2`,
      [pattern, limit]
    );
    return rows.map((row) => normalizeSource(row, "MedlinePlus Definitions"));
  },

  async searchPubMed(query, { limit = 5 } = {}, client = pool) {
    const pattern = likePattern(query);
    try {
      const { rows } = await client.query(
        `select id, pmid, title, abstract, source_url
         from pubmed_articles
         where title like $1 or abstract like $1 or cast(keywords as char) like $1
         order by publication_date desc
         limit $2`,
        [pattern, limit]
      );
      return rows.map((row) =>
        normalizeSource(
          {
            ...row,
            url: row.source_url || `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`,
            source: "PubMed"
          },
          "PubMed"
        )
      );
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE") return [];
      throw error;
    }
  },

  async searchKaggleExplanations(query, { limit = 5 } = {}, client = pool) {
    const pattern = likePattern(query);
    const { rows } = await client.query(
      `select lte.id, lte.standard_name, lte.display_name, lte.explanation, mds.dataset_url, mds.dataset_name, mds.dataset_author
       from lab_test_explanations lte
       left join medical_dataset_sources mds on mds.id = lte.source_id
       where lte.standard_name like $1 or lte.display_name like $1 or lte.explanation like $1 or cast(lte.aliases as char) like $1
       order by lte.updated_at desc
       limit $2`,
      [pattern, limit]
    );
    return rows.map((row) =>
      normalizeSource(
        {
          ...row,
          title: row.display_name,
          source: row.dataset_name || "Kaggle-derived lab explanation",
          url: row.dataset_url
        },
        "Kaggle Lab Knowledge"
      )
    );
  },

  async labReferenceRanges(testName, client = pool) {
    const pattern = likePattern(testName);
    const { rows } = await client.query(
      `select lrr.*, mds.dataset_url, mds.dataset_name
       from lab_reference_ranges lrr
       left join medical_dataset_sources mds on mds.id = lrr.source_id
       where lrr.standard_name like $1 or lrr.test_name like $1
       order by lrr.sample_count desc
       limit 10`,
      [pattern]
    );
    return rows;
  },

  async unifiedSearch(query, { limit = 8 } = {}, client = pool) {
    const perSourceLimit = Math.max(2, Math.ceil(limit / 3));
    const results = await Promise.all([
      this.searchMedlinePlus(query, { limit: perSourceLimit }, client),
      this.searchMedicalTerms(query, { limit: perSourceLimit }, client),
      this.searchPubMed(query, { limit: perSourceLimit }, client),
      this.searchKaggleExplanations(query, { limit: perSourceLimit }, client)
    ]);
    const seen = new Set();
    return results
      .flat()
      .filter((source) => {
        const key = `${source.sourceType}:${source.url || source.id}:${source.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }
};
