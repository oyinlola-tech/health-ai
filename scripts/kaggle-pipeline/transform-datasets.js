import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalColumnName,
  defaultUnits,
  numberValue,
  parseCsv,
  processedRoot,
  readJson,
  reportsRoot,
  safeName,
  sha256,
  standardLabName,
  stripHtml,
  validatedRoot,
  writeJson
} from "./common.js";

const outcomeAliases = new Set(["class", "classification", "target", "outcome", "diagnosis", "disease", "condition", "result"]);

function outcomeColumn(row) {
  return Object.keys(row).find((key) => outcomeAliases.has(canonicalColumnName(key))) || null;
}

function cleanRows(rows) {
  const headers = Object.keys(rows[0] || {});
  const nonEmptyHeaders = headers.filter((header) => rows.some((row) => String(row[header] || "").trim() !== ""));
  const seen = new Set();
  const cleaned = [];
  let duplicateRows = 0;
  for (const row of rows) {
    const normalized = {};
    for (const header of nonEmptyHeaders) {
      const standard = standardLabName(header);
      const key = standard || canonicalColumnName(header);
      const value = stripHtml(row[header]);
      if (!value) continue;
      normalized[key] = value;
    }
    const hash = sha256(JSON.stringify(normalized));
    if (seen.has(hash)) {
      duplicateRows += 1;
      continue;
    }
    seen.add(hash);
    cleaned.push(normalized);
  }
  return { rows: cleaned, duplicateRows, emptyColumnsRemoved: headers.length - nonEmptyHeaders.length };
}

function labStats(rows) {
  const stats = new Map();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const standard = standardLabName(key) || key;
      if (!defaultUnits[standard]) continue;
      const numeric = numberValue(value);
      if (numeric === null) continue;
      if (!stats.has(standard)) stats.set(standard, []);
      stats.get(standard).push(numeric);
    }
  }
  return [...stats.entries()].map(([standard, values]) => ({
    standardName: standard,
    displayName: standard.toUpperCase(),
    unit: defaultUnits[standard],
    observedMin: Math.min(...values),
    observedMax: Math.max(...values),
    observedMean: values.reduce((sum, value) => sum + value, 0) / values.length,
    sampleCount: values.length
  }));
}

function structuredRiskRows(sourceKey, rows) {
  return rows.map((row) => {
    const outcome = outcomeColumn(row);
    const factors = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === outcome) continue;
      factors[key] = value;
    }
    return {
      rowHash: sha256(`${sourceKey}:${JSON.stringify(factors)}:${outcome ? row[outcome] : ""}`),
      factors,
      outcomeLabel: outcome || null,
      outcomeValue: outcome ? row[outcome] : null
    };
  });
}

async function main() {
  const validationReport = await readJson(path.join(validatedRoot, "validation-report.json"));
  if (!validationReport?.datasets?.length) throw new Error("Run npm run kaggle:pipeline:validate before transform.");
  const transformed = [];

  for (const dataset of validationReport.datasets.filter((item) => item.status === "validated")) {
    const allRows = [];
    const fileReports = [];
    for (const file of dataset.files.filter((item) => item.valid)) {
      const rows = parseCsv(await readFile(file.path, "utf8"));
      const cleaned = cleanRows(rows);
      allRows.push(...cleaned.rows);
      fileReports.push({
        file: file.name,
        originalRows: rows.length,
        cleanedRows: cleaned.rows.length,
        duplicateRowsRemoved: cleaned.duplicateRows,
        emptyColumnsRemoved: cleaned.emptyColumnsRemoved
      });
    }
    const labs = labStats(allRows);
    const output = {
      source: {
        sourceKey: dataset.ref,
        datasetName: dataset.title,
        datasetAuthor: dataset.author,
        kaggleUrl: dataset.url,
        license: dataset.license,
        category: dataset.category,
        downloadDate: dataset.downloadedAt,
        datasetSize: dataset.downloadedBytes || dataset.totalBytes || 0,
        purposeCategory: dataset.purpose
      },
      quality: {
        files: fileReports,
        rowCount: allRows.length,
        duplicateRowsRemoved: fileReports.reduce((sum, item) => sum + item.duplicateRowsRemoved, 0),
        emptyColumnsRemoved: fileReports.reduce((sum, item) => sum + item.emptyColumnsRemoved, 0)
      },
      labs,
      riskRows: structuredRiskRows(dataset.ref, allRows)
    };
    const processedPath = path.join(processedRoot, `${safeName(dataset.ref)}.structured.json`);
    await writeJson(processedPath, output);
    transformed.push({ ...output.source, processedPath, rowCount: output.quality.rowCount, labs: labs.map((lab) => lab.standardName), status: "transformed" });
  }

  const report = { generatedAt: new Date().toISOString(), datasets: transformed };
  await writeJson(path.join(processedRoot, "transform-report.json"), report);
  await writeJson(path.join(reportsRoot, "transform-report.json"), report);
  console.log(`Controlled Kaggle transform completed for ${transformed.length} datasets.`);
}

main().catch((error) => {
  console.error(`Controlled Kaggle transform failed: ${error.message}`);
  process.exit(1);
});
