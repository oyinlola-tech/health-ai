import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { ensureDatabaseExists, runJavaScriptMigrations } from "../src/database/bootstrap.js";
import { pool } from "../src/database/connection.js";
import { createId } from "../src/utils/uuid.js";

const cacheDir = path.resolve(".cache/pubmed");
const reportPath = path.resolve("docs/ingestion/pubmed-report.md");
const eutilsBaseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const maxArticles = Number.parseInt(process.env.PUBMED_IMPORT_LIMIT || "10000", 10);
const maxCacheBytes = 1024 * 1024 * 1024;
const batchSize = Number.parseInt(process.env.PUBMED_FETCH_BATCH_SIZE || "200", 10);
const apiKey = process.env.NCBI_API_KEY || "";
const toolName = process.env.NCBI_TOOL || "MedExplainAI";
const email = process.env.NCBI_EMAIL || "";

const queryTerms = [
  "Diabetes",
  "Hypertension",
  "Anemia",
  "Kidney disease",
  "Liver disease",
  "Cholesterol",
  "CBC tests",
  "Blood tests"
];

function boundedLimit(value) {
  if (!Number.isFinite(value) || value < 1) return 10000;
  return Math.min(value, 10000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(node) {
  return String(node?.textContent || "")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlDocument(source) {
  return new JSDOM(source, { contentType: "text/xml" }).window.document;
}

function query() {
  return queryTerms.map((term) => `"${term}"[Title/Abstract]`).join(" OR ");
}

function eutilsUrl(endpoint, params) {
  const url = new URL(`${eutilsBaseUrl}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  if (apiKey) url.searchParams.set("api_key", apiKey);
  if (toolName) url.searchParams.set("tool", toolName);
  if (email) url.searchParams.set("email", email);
  return url;
}

async function fetchWithRetry(url, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError.message}`);
}

async function writeCache(filename, content) {
  await mkdir(cacheDir, { recursive: true });
  const target = path.join(cacheDir, filename);
  await writeFile(target, content);
  return target;
}

async function searchPmids(sourceQuery, limit, retstart = 0) {
  const params = {
    db: "pubmed",
    term: sourceQuery,
    retstart,
    retmax: limit,
    sort: "relevance"
  };
  const url = eutilsUrl("esearch.fcgi", { ...params, retmode: "json" });
  const raw = await (await fetchWithRetry(url)).text();
  await writeCache(`esearch-${String(retstart).padStart(5, "0")}.json`, raw);
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    const xmlUrl = eutilsUrl("esearch.fcgi", { ...params, retmode: "xml" });
    const xml = await (await fetchWithRetry(xmlUrl)).text();
    await writeCache(`esearch-${String(retstart).padStart(5, "0")}.xml`, xml);
    const document = xmlDocument(xml);
    return {
      url: xmlUrl.toString(),
      count: Number(text(document.querySelector("Count")) || 0),
      ids: [...document.querySelectorAll("IdList > Id")].map(text)
    };
  }
  return {
    url: url.toString(),
    count: Number(payload?.esearchresult?.count || 0),
    ids: payload?.esearchresult?.idlist || []
  };
}

async function fetchArticles(pmids, offset) {
  const url = eutilsUrl("efetch.fcgi", {
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml"
  });
  const xml = await (await fetchWithRetry(url)).text();
  const filename = `efetch-${String(offset).padStart(5, "0")}.xml`;
  await writeCache(filename, xml);
  return { url: `${eutilsBaseUrl}/efetch.fcgi?db=pubmed&retmode=xml`, xml };
}

function normalizeMonth(value) {
  const months = new Map([
    ["jan", "01"],
    ["feb", "02"],
    ["mar", "03"],
    ["apr", "04"],
    ["may", "05"],
    ["jun", "06"],
    ["jul", "07"],
    ["aug", "08"],
    ["sep", "09"],
    ["oct", "10"],
    ["nov", "11"],
    ["dec", "12"]
  ]);
  const clean = String(value || "").slice(0, 3).toLowerCase();
  if (months.has(clean)) return months.get(clean);
  const numeric = Number.parseInt(value, 10);
  if (numeric >= 1 && numeric <= 12) return String(numeric).padStart(2, "0");
  return "01";
}

function publicationDate(article) {
  const dateNode = article.querySelector("ArticleDate") || article.querySelector("PubDate");
  const year = text(dateNode?.querySelector("Year"));
  if (!/^\d{4}$/.test(year)) return { value: null, label: text(dateNode) || null };
  const month = normalizeMonth(text(dateNode?.querySelector("Month")));
  const dayText = Number.parseInt(text(dateNode?.querySelector("Day")), 10);
  const day = dayText >= 1 && dayText <= 31 ? String(dayText).padStart(2, "0") : "01";
  return { value: `${year}-${month}-${day}`, label: text(dateNode) || `${year}-${month}-${day}` };
}

function authors(article) {
  return [...article.querySelectorAll("AuthorList > Author")].map((author) => {
    const collective = text(author.querySelector("CollectiveName"));
    if (collective) return collective;
    return [text(author.querySelector("ForeName")), text(author.querySelector("LastName"))].filter(Boolean).join(" ");
  }).filter(Boolean);
}

function keywords(article) {
  return [...article.querySelectorAll("KeywordList > Keyword")].map(text).filter(Boolean);
}

function abstract(article) {
  return [...article.querySelectorAll("Abstract AbstractText")].map((node) => {
    const label = node.getAttribute("Label");
    const value = text(node);
    return label ? `${label}: ${value}` : value;
  }).filter(Boolean).join("\n\n");
}

function parseArticles(xml, sourceUrl, sourceQuery) {
  const document = xmlDocument(xml);
  return [...document.querySelectorAll("PubmedArticle")].map((article) => {
    const pmid = text(article.querySelector("MedlineCitation > PMID"));
    const date = publicationDate(article);
    return {
      pmid,
      title: text(article.querySelector("ArticleTitle")) || `PubMed article ${pmid}`,
      abstract: abstract(article) || null,
      publicationDate: date.value,
      publicationDateText: date.label,
      authors: authors(article),
      keywords: keywords(article),
      queryTerms,
      sourceQuery,
      sourceUrl
    };
  }).filter((article) => article.pmid);
}

async function upsertArticles(connection, articles) {
  let imported = 0;
  for (const article of articles) {
    await connection.execute(
      `insert into pubmed_articles (
        id, pmid, title, abstract, publication_date, publication_date_text,
        authors, keywords, query_terms, source_query, source_url, fetched_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
      on duplicate key update
        title = values(title),
        abstract = values(abstract),
        publication_date = values(publication_date),
        publication_date_text = values(publication_date_text),
        authors = values(authors),
        keywords = values(keywords),
        query_terms = values(query_terms),
        source_query = values(source_query),
        source_url = values(source_url),
        fetched_at = now(),
        updated_at = now()`,
      [
        createId(),
        article.pmid,
        article.title,
        article.abstract,
        article.publicationDate,
        article.publicationDateText,
        JSON.stringify(article.authors),
        JSON.stringify(article.keywords),
        JSON.stringify(article.queryTerms),
        article.sourceQuery,
        article.sourceUrl
      ]
    );
    imported += 1;
  }
  return imported;
}

async function existingPmids(connection) {
  const [rows] = await connection.execute("select pmid from pubmed_articles");
  return new Set(rows.map((row) => String(row.pmid)));
}

async function articleCount(connection) {
  const [rows] = await connection.execute("select count(*) as count from pubmed_articles");
  return Number(rows[0]?.count || 0);
}

async function cacheSizeBytes() {
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(cacheDir).catch(() => []));
  let total = 0;
  for (const entry of entries) {
    const info = await stat(path.join(cacheDir, entry)).catch(() => null);
    if (info?.isFile()) total += info.size;
  }
  return total;
}

function report({ sourceQuery, searchUrl, totalAvailable, requested, searchedPmids, skippedExisting, imported, totalCached, cacheBytes, batches }) {
  return [
    "# PubMed Ingestion Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Source",
    "",
    "- API: NCBI PubMed E-utilities",
    `- ESearch URL: ${searchUrl}`,
    `- Query: ${sourceQuery}`,
    "",
    "## Terms",
    "",
    ...queryTerms.map((term) => `- ${term}`),
    "",
    "## Imported",
    "",
    `- Total PubMed matches available: ${totalAvailable}`,
    `- Initial import cap: ${requested}`,
    `- PMIDs searched this run: ${searchedPmids}`,
    `- Existing matching articles skipped: ${skippedExisting}`,
    `- Articles imported/upserted this run: ${imported}`,
    `- Total cached articles in database: ${totalCached}`,
    `- EFetch batches: ${batches}`,
    `- Local cache bytes: ${cacheBytes}`,
    "",
    "## Table",
    "",
    "- `pubmed_articles`",
    "",
    "## Constraints",
    "",
    "- The full PubMed corpus was not downloaded.",
    "- Initial import is capped at 10,000 articles.",
    "- Cached API responses are kept under `.cache/pubmed`.",
    "- The importer refuses to continue if local cache size exceeds 1 GB."
  ].join("\n");
}

async function main() {
  if (boundedLimit(maxArticles) !== maxArticles) throw new Error("PUBMED_IMPORT_LIMIT must be between 1 and 10000.");
  await mkdir(path.dirname(reportPath), { recursive: true });

  const sourceQuery = query();
  await ensureDatabaseExists();
  const connection = await pool.raw.getConnection();
  let imported = 0;
  let batches = 0;
  let skippedExisting = 0;
  let totalCached = 0;
  let totalAvailable = 0;
  let searchUrl = "";
  let searchedPmids = 0;
  try {
    await runJavaScriptMigrations(connection);
    totalCached = await articleCount(connection);
    let retstart = Math.max(0, totalCached - 100);
    while (totalCached < maxArticles) {
      const retmax = Math.min(1000, maxArticles - totalCached + 100);
      const search = await searchPmids(sourceQuery, retmax, retstart);
      if (!searchUrl) searchUrl = search.url;
      if (search.count > 0) totalAvailable = search.count;
      if (!search.ids.length) break;
      searchedPmids += search.ids.length;
      retstart += search.ids.length;

      const existing = await existingPmids(connection);
      const remainingPmids = search.ids.filter((pmid) => {
        const alreadyExists = existing.has(String(pmid));
        if (alreadyExists) skippedExisting += 1;
        return !alreadyExists;
      });

      for (let offset = 0; offset < remainingPmids.length && totalCached < maxArticles; offset += batchSize) {
        const batch = remainingPmids.slice(offset, offset + batchSize);
        const fetched = await fetchArticles(batch, batches * batchSize);
        const articles = parseArticles(fetched.xml, fetched.url, sourceQuery).slice(0, maxArticles - totalCached);
        imported += await upsertArticles(connection, articles);
        totalCached = await articleCount(connection);
        batches += 1;
        const bytes = await cacheSizeBytes();
        if (bytes > maxCacheBytes) throw new Error("Refusing to continue; PubMed cache exceeds 1 GB.");
        if (!apiKey) await sleep(400);
      }

      if (totalAvailable > 0 && retstart >= totalAvailable) break;
    }
  } finally {
    connection.release();
    await pool.end();
  }

  const cacheBytes = await cacheSizeBytes();
  const content = report({
    sourceQuery,
    searchUrl,
    totalAvailable,
    requested: maxArticles,
    searchedPmids,
    skippedExisting,
    imported,
    totalCached,
    cacheBytes,
    batches
  });
  await writeFile(reportPath, `${content}\n`);
  console.log(content);
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(`PubMed ingestion failed: ${error.message}`);
  process.exit(1);
});
