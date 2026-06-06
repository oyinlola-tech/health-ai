import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { JSDOM } from "jsdom";
import { ensureDatabaseExists, runJavaScriptMigrations } from "../src/database/bootstrap.js";
import { pool } from "../src/database/connection.js";
import { createId } from "../src/utils/uuid.js";

const xmlPageUrl = "https://medlineplus.gov/xml.html";
const cacheDir = path.resolve(".cache/medlineplus");
const reportPath = path.resolve("docs/ingestion/medlineplus-report.md");
const maxImportedBytes = 1024 * 1024 * 1024;

function absoluteUrl(href) {
  return new URL(href, xmlPageUrl).toString();
}

function text(node) {
  return node?.textContent?.trim() || "";
}

function cleanDefinition(value) {
  return String(value || "").trim().replace(/^>\s*/, "").trim();
}

function parseXml(source) {
  return new JSDOM(source, { contentType: "text/xml" }).window.document;
}

async function download(url, filename) {
  await mkdir(cacheDir, { recursive: true });
  const target = path.join(cacheDir, filename);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  return { path: target, bytes: buffer.length };
}

function findLatestLinks(html) {
  const document = new JSDOM(html).window.document;
  const anchors = [...document.querySelectorAll("a[href]")].map((anchor) => ({
    href: absoluteUrl(anchor.getAttribute("href")),
    label: text(anchor)
  }));

  const topics = anchors.find((anchor) => /mplus_topics_compressed_\d{4}-\d{2}-\d{2}\.zip$/i.test(anchor.href));
  const definitions = anchors.filter((anchor) => /definitions\.xml$/i.test(anchor.href) && /Definitions of Health Terms/i.test(anchor.label));

  if (!topics) throw new Error("Could not find the latest compressed MedlinePlus Health Topics XML link.");
  if (!definitions.length) throw new Error("Could not find MedlinePlus Health Definitions XML links.");

  return { topics, definitions };
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("ZIP end of central directory was not found.");
}

function extractFirstXmlFromZip(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entries = buffer.readUInt16LE(eocd + 10);
  let centralOffset = buffer.readUInt32LE(eocd + 16);

  for (let index = 0; index < entries; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("Invalid ZIP central directory.");
    const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42);
    const filename = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8");

    if (filename.toLowerCase().endsWith(".xml")) {
      if (uncompressedSize > maxImportedBytes) throw new Error(`Refusing to extract ${filename}; uncompressed size exceeds 1 GB.`);
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) throw new Error("Invalid ZIP local file header.");
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const data = compressionMethod === 0 ? compressed : zlib.inflateRawSync(compressed);
      return { filename, xml: data.toString("utf8"), bytes: data.length };
    }

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error("No XML entry was found in the compressed Health Topics ZIP.");
}

function parseTopics(xml, sourceUrl) {
  const document = parseXml(xml);
  const generatedAt = document.querySelector("health-topics")?.getAttribute("date-generated") || null;

  return [...document.querySelectorAll("health-topic")].map((topic) => ({
    medlineplusId: topic.getAttribute("id") || null,
    title: topic.getAttribute("title") || text(topic.querySelector("title")),
    summary: text(topic.querySelector("full-summary")),
    url: topic.getAttribute("url"),
    relatedTopics: [...topic.querySelectorAll("related-topic")].map((related) => ({
      title: text(related),
      url: related.getAttribute("url") || null,
      id: related.getAttribute("id") || null
    })),
    nihInstitute: text(topic.querySelector("primary-institute")) || null,
    language: topic.getAttribute("language") || "Unknown",
    categories: [...topic.querySelectorAll("group")].map((group) => ({
      title: text(group),
      url: group.getAttribute("url") || null,
      id: group.getAttribute("id") || null
    })),
    sourceUrl,
    sourceGeneratedAt: generatedAt
  }));
}

function parseDefinitionCategory(url) {
  return path.basename(new URL(url).pathname).replace("definitions.xml", "") || "general";
}

function parseDefinitions(xml, sourceUrl) {
  const category = parseDefinitionCategory(sourceUrl);
  const document = parseXml(xml);

  return [...document.querySelectorAll("term-group")].map((group) => ({
    term: cleanDefinition(text(group.querySelector("term"))),
    definition: cleanDefinition(text(group.querySelector("definition"))),
    source: group.getAttribute("reference") || "MedlinePlus",
    sourceUrl: group.getAttribute("reference-url") || sourceUrl,
    category
  })).filter((entry) => entry.term && entry.definition);
}

async function upsertTopics(connection, topics) {
  let imported = 0;
  for (const topic of topics) {
    await connection.execute(
      `insert into medlineplus_topics (
        id, medlineplus_id, title, summary, url, related_topics, nih_institute,
        language, categories, source_url, source_generated_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on duplicate key update
        medlineplus_id = values(medlineplus_id),
        title = values(title),
        summary = values(summary),
        related_topics = values(related_topics),
        nih_institute = values(nih_institute),
        language = values(language),
        categories = values(categories),
        source_url = values(source_url),
        source_generated_at = values(source_generated_at),
        updated_at = now()`,
      [
        createId(),
        topic.medlineplusId,
        topic.title,
        topic.summary,
        topic.url,
        JSON.stringify(topic.relatedTopics),
        topic.nihInstitute,
        topic.language,
        JSON.stringify(topic.categories),
        topic.sourceUrl,
        topic.sourceGeneratedAt
      ]
    );
    imported += 1;
  }
  return imported;
}

async function upsertTerms(connection, terms) {
  let imported = 0;
  for (const term of terms) {
    await connection.execute(
      `insert into medical_terms (id, term, definition, source, source_url, category)
       values (?, ?, ?, ?, ?, ?)
       on duplicate key update
        definition = values(definition),
        source_url = values(source_url),
        updated_at = now()`,
      [createId(), term.term, term.definition, term.source, term.sourceUrl, term.category]
    );
    imported += 1;
  }
  return imported;
}

async function cacheSizeBytes() {
  let total = 0;
  for (const file of ["topics.zip", "topics.xml"]) {
    const filePath = path.join(cacheDir, file);
    const info = await stat(filePath).catch(() => null);
    if (info) total += info.size;
  }
  return total;
}

function report({ topicsLink, definitionLinks, topicCount, termCount, bytes }) {
  return [
    "# MedlinePlus Ingestion Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Sources",
    "",
    `- Health Topics XML: ${topicsLink.href}`,
    ...definitionLinks.map((link) => `- Health Definitions XML: ${link.href}`),
    "",
    "## Imported",
    "",
    `- Topics: ${topicCount}`,
    `- Terms: ${termCount}`,
    `- Local cache/import bytes: ${bytes}`,
    "",
    "## Tables",
    "",
    "- `medlineplus_topics`",
    "- `medical_terms`",
    "",
    "## Constraints",
    "",
    "- MIMIC-IV was not downloaded.",
    "- Large PubMed datasets were not downloaded.",
    "- Import refuses compressed/uncompressed data above 1 GB.",
    "- Data comes from official MedlinePlus XML files only."
  ].join("\n");
}

async function main() {
  await mkdir(path.dirname(reportPath), { recursive: true });

  const sourceHtml = await (await fetch(xmlPageUrl)).text();
  const { topics, definitions } = findLatestLinks(sourceHtml);

  const topicZip = await download(topics.href, "topics.zip");
  if (topicZip.bytes > maxImportedBytes) throw new Error("Refusing to import; downloaded Health Topics ZIP exceeds 1 GB.");
  const zipBuffer = await readFile(topicZip.path);
  const extracted = extractFirstXmlFromZip(zipBuffer);
  await writeFile(path.join(cacheDir, "topics.xml"), extracted.xml);

  const parsedTopics = parseTopics(extracted.xml, topics.href);
  const parsedTerms = [];
  let definitionBytes = 0;
  for (const definitionLink of definitions) {
    const filename = path.basename(new URL(definitionLink.href).pathname);
    const downloaded = await download(definitionLink.href, filename);
    definitionBytes += downloaded.bytes;
    parsedTerms.push(...parseDefinitions(await readFile(downloaded.path, "utf8"), definitionLink.href));
  }

  const bytes = (await cacheSizeBytes()) + definitionBytes;
  if (bytes > maxImportedBytes) throw new Error("Refusing to import; MedlinePlus local cache exceeds 1 GB.");

  await ensureDatabaseExists();
  const connection = await pool.raw.getConnection();
  let topicCount = 0;
  let termCount = 0;
  try {
    await runJavaScriptMigrations(connection);
    topicCount = await upsertTopics(connection, parsedTopics);
    termCount = await upsertTerms(connection, parsedTerms);
  } finally {
    connection.release();
    await pool.end();
  }

  const content = report({
    topicsLink: topics,
    definitionLinks: definitions,
    topicCount,
    termCount,
    bytes
  });
  await writeFile(reportPath, `${content}\n`);
  console.log(content);
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(`MedlinePlus ingestion failed: ${error.message}`);
  process.exit(1);
});
