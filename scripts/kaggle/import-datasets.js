import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDatabaseExists, runJavaScriptMigrations } from "../../src/database/bootstrap.js";
import { pool } from "../../src/database/connection.js";
import { createId } from "../../src/utils/uuid.js";
import {
  ensureDataDirs,
  extractedRoot,
  parseCsv,
  processedRoot,
  readJson,
  reportPath,
  safeName,
  sha256,
  stripHtml,
  writeJson
} from "./common.js";

const labAliases = new Map([
  ["hemoglobin", ["hemoglobin", "haemoglobin", "hgb", "hb"]],
  ["wbc", ["wbc", "white blood cell", "white blood cells", "white_blood_cell_count", "wc"]],
  ["rbc", ["rbc", "red blood cell", "red blood cells", "red_blood_cell_count", "rc"]],
  ["platelets", ["platelets", "platelet", "platelet_count", "pc"]],
  ["glucose", ["glucose", "blood glucose", "sugar", "blood sugar"]],
  ["creatinine", ["creatinine", "serum creatinine", "sc"]],
  ["urea", ["urea", "blood urea", "bun", "blood urea nitrogen"]],
  ["alt", ["alt", "sgpt", "alanine aminotransferase", "alamine aminotransferase"]],
  ["ast", ["ast", "sgot", "aspartate aminotransferase"]],
  ["tsh", ["tsh", "thyroid stimulating hormone"]],
  ["hdl", ["hdl", "hdl cholesterol"]],
  ["ldl", ["ldl", "ldl cholesterol"]]
]);

const labExplanations = {
  hemoglobin: "Hemoglobin is a red blood cell protein that carries oxygen through the body.",
  wbc: "White blood cell count helps describe immune and infection-related activity.",
  rbc: "Red blood cell count describes the number of oxygen-carrying blood cells.",
  platelets: "Platelets help blood clot and are commonly measured in complete blood count panels.",
  glucose: "Glucose measures blood sugar and is commonly used in diabetes screening and monitoring.",
  creatinine: "Creatinine is commonly used as a marker of kidney filtration function.",
  urea: "Urea or BUN reflects nitrogen waste handling and can be related to kidney or hydration status.",
  alt: "ALT is a liver enzyme often used to evaluate liver cell irritation or injury.",
  ast: "AST is an enzyme found in liver, heart, and muscle tissue and is often reviewed with ALT.",
  tsh: "TSH is a pituitary hormone used to evaluate thyroid function.",
  hdl: "HDL cholesterol is often called protective cholesterol because higher values are generally favorable.",
  ldl: "LDL cholesterol is often reviewed as a cardiovascular risk marker."
};

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function standardLabName(column) {
  const normalized = normalizeName(column);
  for (const [standard, aliases] of labAliases) {
    if (
      aliases.some((alias) => {
        const normalizedAlias = normalizeName(alias);
        if (normalized === normalizedAlias) return true;
        if (normalizedAlias.length <= 3) return normalized.split(" ").includes(normalizedAlias);
        return normalized.includes(normalizedAlias);
      })
    ) {
      return standard;
    }
  }
  return null;
}

function numberValue(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanRows(rows) {
  const headers = Object.keys(rows[0] || {});
  const nonEmptyHeaders = headers.filter((header) => rows.some((row) => String(row[header] || "").trim() !== ""));
  const seen = new Set();
  const cleaned = [];
  let duplicateRows = 0;

  for (const row of rows) {
    const clean = Object.fromEntries(nonEmptyHeaders.map((header) => [header, stripHtml(row[header])]));
    const hash = sha256(JSON.stringify(clean));
    if (seen.has(hash)) {
      duplicateRows += 1;
      continue;
    }
    seen.add(hash);
    cleaned.push(clean);
  }

  return {
    rows: cleaned,
    emptyColumnsRemoved: headers.length - nonEmptyHeaders.length,
    duplicateRows
  };
}

function outcomeColumn(row) {
  const candidates = ["class", "classification", "target", "outcome", "diagnosis", "disease", "condition", "result"];
  return Object.keys(row).find((key) => candidates.includes(normalizeName(key))) || null;
}

function conditionName(category) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function upsertSource(connection, dataset, rowCount, processedPath, qualityReport, status) {
  const id = createId();
  await connection.execute(
    `insert into medical_dataset_sources (
      id, source_key, dataset_name, dataset_author, dataset_url, kaggle_ref, category,
      license, download_date, raw_path, extracted_path, processed_path, size_bytes,
      row_count, import_status, quality_report
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on duplicate key update
      dataset_name = values(dataset_name),
      dataset_author = values(dataset_author),
      dataset_url = values(dataset_url),
      license = values(license),
      download_date = values(download_date),
      raw_path = values(raw_path),
      extracted_path = values(extracted_path),
      processed_path = values(processed_path),
      size_bytes = values(size_bytes),
      row_count = values(row_count),
      import_status = values(import_status),
      quality_report = values(quality_report),
      updated_at = now()`,
    [
      id,
      dataset.resolvedRef,
      dataset.title,
      dataset.author,
      dataset.url,
      dataset.resolvedRef,
      dataset.category,
      dataset.license,
      dataset.downloadedAt ? new Date(dataset.downloadedAt) : null,
      dataset.rawPath,
      dataset.extractedPath,
      processedPath,
      dataset.totalBytes || 0,
      rowCount,
      status,
      JSON.stringify(qualityReport)
    ]
  );
  const [rows] = await connection.execute("select id from medical_dataset_sources where source_key = ? limit 1", [dataset.resolvedRef]);
  return rows[0].id;
}

async function upsertCondition(connection, sourceId, category) {
  const name = conditionName(category);
  await connection.execute(
    `insert into medical_conditions (id, name, category, description, source_id, metadata)
     values (?, ?, ?, ?, ?, ?)
     on duplicate key update updated_at = now()`,
    [createId(), name, category, `Condition imported from Kaggle category ${category}.`, sourceId, JSON.stringify({ importedFrom: "kaggle" })]
  );
  const [rows] = await connection.execute("select id from medical_conditions where name = ? and category = ? limit 1", [name, category]);
  return rows[0].id;
}

async function upsertLabExplanations(connection, sourceId, standardNames) {
  for (const standard of standardNames) {
    await connection.execute(
      `insert into lab_test_explanations (id, standard_name, display_name, explanation, aliases, source_id)
       values (?, ?, ?, ?, ?, ?)
       on duplicate key update
        explanation = values(explanation),
        aliases = values(aliases),
        updated_at = now()`,
      [
        createId(),
        standard,
        standard.toUpperCase(),
        labExplanations[standard] || `${standard} is a normalized laboratory measurement imported from Kaggle datasets.`,
        JSON.stringify(labAliases.get(standard) || []),
        sourceId
      ]
    );
  }
}

async function upsertLabRanges(connection, sourceId, rows) {
  await connection.execute("delete from lab_reference_ranges where source_id = ?", [sourceId]);
  const byLab = new Map();
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      const standard = standardLabName(column);
      const numeric = standard ? numberValue(value) : null;
      if (!standard || numeric === null) continue;
      if (!byLab.has(standard)) byLab.set(standard, []);
      byLab.get(standard).push(numeric);
    }
  }

  for (const [standard, values] of byLab) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    await connection.execute(
      `insert into lab_reference_ranges (
        id, source_id, test_name, standard_name, observed_min, observed_max,
        observed_mean, sample_count, metadata
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
      on duplicate key update
        observed_min = values(observed_min),
        observed_max = values(observed_max),
        observed_mean = values(observed_mean),
        sample_count = values(sample_count),
        metadata = values(metadata),
        updated_at = now()`,
      [createId(), sourceId, standard.toUpperCase(), standard, min, max, mean, values.length, JSON.stringify({ rangeType: "observed_dataset_values" })]
    );
  }
  return [...byLab.keys()];
}

async function insertRiskFactors(connection, sourceId, conditionId, rows) {
  await connection.execute("delete from disease_risk_factors where source_id = ?", [sourceId]);
  let inserted = 0;
  const batchSize = 250;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = [];
    const params = [];
    for (const row of batch) {
      const outcome = outcomeColumn(row);
      const factors = {};
      for (const [column, value] of Object.entries(row)) {
        const standard = standardLabName(column);
        factors[standard || normalizeName(column).replaceAll(" ", "_")] = value;
      }
      const rowHash = sha256(`${sourceId}:${JSON.stringify(factors)}`);
      values.push("(?, ?, ?, ?, ?, ?, ?, ?)");
      params.push(
        createId(),
        conditionId,
        sourceId,
        rowHash,
        JSON.stringify(factors),
        outcome,
        outcome ? row[outcome] : null,
        JSON.stringify({ importedFrom: "kaggle" })
      );
    }
    if (!values.length) continue;
    await connection.execute(
      `insert into disease_risk_factors (id, condition_id, source_id, row_hash, factors, outcome_label, outcome_value, metadata)
       values ${values.join(",")}
       on duplicate key update metadata = values(metadata)`,
      params
    );
    inserted += batch.length;
  }
  return inserted;
}

async function insertSymptoms(connection, sourceId, conditionId, rows, category) {
  await connection.execute("delete from medical_symptoms where source_id = ?", [sourceId]);
  if (category !== "symptoms") return 0;
  const names = new Set();
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      if (String(value || "").trim() && !["disease", "condition", "prognosis"].includes(normalizeName(column))) names.add(column);
    }
  }
  for (const name of names) {
    await connection.execute(
      `insert into medical_symptoms (id, name, normalized_name, condition_id, source_id, metadata)
       values (?, ?, ?, ?, ?, ?)
       on duplicate key update updated_at = now()`,
      [createId(), name, normalizeName(name).replaceAll(" ", "_"), conditionId, sourceId, JSON.stringify({ importedFrom: "kaggle" })]
    );
  }
  return names.size;
}

function csvFiles(dataset) {
  return dataset.files.filter((file) => /\.csv$/i.test(file.path));
}

async function main() {
  await ensureDataDirs();
  const extractionReport = await readJson(path.join(extractedRoot, "extraction-report.json"), { datasets: [] });
  await ensureDatabaseExists();
  const connection = await pool.raw.getConnection();
  const imports = [];

  try {
    await runJavaScriptMigrations(connection);
    for (const dataset of extractionReport.datasets) {
      const files = csvFiles(dataset);
      const datasetRows = [];
      const fileReports = [];

      for (const file of files) {
        const rows = parseCsv(await readFile(file.path, "utf8"));
        const cleaned = cleanRows(rows);
        datasetRows.push(...cleaned.rows);
        fileReports.push({
          file: file.path,
          originalRows: rows.length,
          cleanedRows: cleaned.rows.length,
          duplicateRowsRemoved: cleaned.duplicateRows,
          emptyColumnsRemoved: cleaned.emptyColumnsRemoved
        });
      }

      const processedPath = path.join(processedRoot, `${safeName(dataset.resolvedRef)}.json`);
      await mkdir(path.dirname(processedPath), { recursive: true });
      await writeFile(processedPath, `${JSON.stringify(datasetRows, null, 2)}\n`);
      const qualityReport = {
        files: fileReports,
        duplicateRowsRemoved: fileReports.reduce((sum, item) => sum + item.duplicateRowsRemoved, 0),
        emptyColumnsRemoved: fileReports.reduce((sum, item) => sum + item.emptyColumnsRemoved, 0)
      };
      const sourceId = await upsertSource(connection, dataset, datasetRows.length, processedPath, qualityReport, files.length ? "imported" : "no-csv-files");
      const conditionId = await upsertCondition(connection, sourceId, dataset.category);
      const labs = await upsertLabRanges(connection, sourceId, datasetRows);
      await upsertLabExplanations(connection, sourceId, labs);
      const riskRows = await insertRiskFactors(connection, sourceId, conditionId, datasetRows);
      const symptomRows = await insertSymptoms(connection, sourceId, conditionId, datasetRows, dataset.category);

      imports.push({
        dataset: dataset.resolvedRef,
        category: dataset.category,
        status: files.length ? "imported" : "no-csv-files",
        rows: datasetRows.length,
        riskRows,
        symptomRows,
        labs,
        qualityReport
      });
    }
  } finally {
    connection.release();
    await pool.end();
  }

  await writeJson(path.join(processedRoot, "import-report.json"), {
    generatedAt: new Date().toISOString(),
    imports
  });

  const lines = [
    "# Kaggle Datasets Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Database",
    "",
    "- Target: MySQL/AMPPS",
    "- PostgreSQL was not used because this repository is configured for MySQL/AMPPS only.",
    "",
    "## Imported Datasets",
    "",
    ...imports.map((item) => `- ${item.dataset} (${item.category}): ${item.status}, rows=${item.rows}, labs=${item.labs.join(", ") || "none"}`),
    "",
    "## Table Mappings",
    "",
    "- `medical_dataset_sources`: one row per Kaggle dataset source",
    "- `medical_conditions`: one condition/category row per source",
    "- `disease_risk_factors`: cleaned CSV rows as normalized factor JSON",
    "- `lab_reference_ranges`: observed min/max/mean for normalized lab columns",
    "- `lab_test_explanations`: explanations for recognized lab tests",
    "- `medical_symptoms`: symptom columns from symptom datasets",
    "",
    "## Quality",
    "",
    ...imports.map((item) => `- ${item.dataset}: duplicates removed=${item.qualityReport.duplicateRowsRemoved}, empty columns removed=${item.qualityReport.emptyColumnsRemoved}`)
  ];
  await writeFile(reportPath, `${lines.join("\n")}\n`);
  console.log(`Kaggle import completed for ${imports.length} datasets.`);
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(`Kaggle import failed: ${error.message}`);
  process.exit(1);
});
