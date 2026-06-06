import path from "node:path";
import { ensureDatabaseExists, runJavaScriptMigrations } from "../../src/database/bootstrap.js";
import { pool } from "../../src/database/connection.js";
import { createId } from "../../src/utils/uuid.js";
import { labAliases, labExplanations, processedRoot, readJson, reportsRoot, writeJson } from "./common.js";

function conditionName(category) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function upsertSource(connection, source, quality, processedPath) {
  const id = createId();
  const payload = [
    id,
    source.sourceKey,
    source.datasetName,
    source.datasetAuthor,
    source.kaggleUrl,
    source.sourceKey,
    source.category,
    source.license,
    source.downloadDate ? new Date(source.downloadDate) : null,
    null,
    null,
    processedPath,
    source.datasetSize || 0,
    quality.rowCount || 0,
    "controlled-imported",
    JSON.stringify(quality)
  ];
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
      processed_path = values(processed_path),
      size_bytes = values(size_bytes),
      row_count = values(row_count),
      import_status = values(import_status),
      quality_report = values(quality_report),
      updated_at = now()`,
    payload
  );
  await connection.execute(
    `insert into dataset_sources (
      id, source_key, dataset_name, dataset_author, dataset_url, kaggle_ref, category,
      license, download_date, dataset_size_bytes, row_count, purpose_category, quality_report
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on duplicate key update
      dataset_name = values(dataset_name),
      dataset_author = values(dataset_author),
      dataset_url = values(dataset_url),
      license = values(license),
      download_date = values(download_date),
      dataset_size_bytes = values(dataset_size_bytes),
      row_count = values(row_count),
      purpose_category = values(purpose_category),
      quality_report = values(quality_report),
      updated_at = now()`,
    [
      createId(),
      source.sourceKey,
      source.datasetName,
      source.datasetAuthor,
      source.kaggleUrl,
      source.sourceKey,
      source.category,
      source.license,
      source.downloadDate ? new Date(source.downloadDate) : null,
      source.datasetSize || 0,
      quality.rowCount || 0,
      source.purposeCategory,
      JSON.stringify(quality)
    ]
  );
  const [rows] = await connection.execute("select id from medical_dataset_sources where source_key = ? limit 1", [source.sourceKey]);
  return rows[0].id;
}

async function upsertCondition(connection, sourceId, category) {
  const name = conditionName(category);
  await connection.execute(
    `insert into medical_conditions (id, name, category, description, source_id, metadata)
     values (?, ?, ?, ?, ?, ?)
     on duplicate key update description = values(description), metadata = values(metadata), updated_at = now()`,
    [createId(), name, category, `Controlled Kaggle dataset category for ${name}.`, sourceId, JSON.stringify({ importedFrom: "controlled-kaggle-pipeline" })]
  );
  const [rows] = await connection.execute("select id from medical_conditions where name = ? and category = ? limit 1", [name, category]);
  return rows[0].id;
}

async function upsertLabs(connection, sourceId, labs) {
  await connection.execute("delete from lab_reference_ranges where source_id = ?", [sourceId]);
  for (const lab of labs) {
    await connection.execute(
      `insert into lab_reference_ranges (
        id, source_id, test_name, standard_name, unit, observed_min, observed_max, observed_mean, sample_count, metadata
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on duplicate key update
        unit = values(unit),
        observed_min = values(observed_min),
        observed_max = values(observed_max),
        observed_mean = values(observed_mean),
        sample_count = values(sample_count),
        metadata = values(metadata),
        updated_at = now()`,
      [
        createId(),
        sourceId,
        lab.displayName,
        lab.standardName,
        lab.unit,
        lab.observedMin,
        lab.observedMax,
        lab.observedMean,
        lab.sampleCount,
        JSON.stringify({ rangeType: "observed_controlled_dataset_values" })
      ]
    );
    await connection.execute(
      `insert into lab_test_explanations (id, standard_name, display_name, explanation, aliases, source_id)
       values (?, ?, ?, ?, ?, ?)
       on duplicate key update explanation = values(explanation), aliases = values(aliases), updated_at = now()`,
      [
        createId(),
        lab.standardName,
        lab.displayName,
        labExplanations[lab.standardName] || `${lab.displayName} is a normalized laboratory measurement.`,
        JSON.stringify(labAliases.get(lab.standardName) || []),
        sourceId
      ]
    );
  }
}

async function insertRiskRows(connection, sourceId, conditionId, riskRows) {
  await connection.execute("delete from disease_risk_factors where source_id = ?", [sourceId]);
  const batchSize = 250;
  for (let offset = 0; offset < riskRows.length; offset += batchSize) {
    const batch = riskRows.slice(offset, offset + batchSize);
    const values = [];
    const params = [];
    for (const row of batch) {
      values.push("(?, ?, ?, ?, ?, ?, ?, ?)");
      params.push(createId(), conditionId, sourceId, row.rowHash, JSON.stringify(row.factors), row.outcomeLabel, row.outcomeValue, JSON.stringify({ importedFrom: "controlled-kaggle-pipeline" }));
    }
    if (!values.length) continue;
    await connection.execute(
      `insert into disease_risk_factors (id, condition_id, source_id, row_hash, factors, outcome_label, outcome_value, metadata)
       values ${values.join(",")}
       on duplicate key update metadata = values(metadata)`,
      params
    );
  }
}

async function main() {
  const transformReport = await readJson(path.join(processedRoot, "transform-report.json"));
  if (!transformReport?.datasets?.length) throw new Error("Run npm run kaggle:pipeline:transform before import.");
  await ensureDatabaseExists();
  const connection = await pool.raw.getConnection();
  const imports = [];
  try {
    await runJavaScriptMigrations(connection);
    for (const dataset of transformReport.datasets) {
      const structured = await readJson(dataset.processedPath);
      const sourceId = await upsertSource(connection, structured.source, structured.quality, dataset.processedPath);
      const conditionId = await upsertCondition(connection, sourceId, structured.source.category);
      await upsertLabs(connection, sourceId, structured.labs);
      await insertRiskRows(connection, sourceId, conditionId, structured.riskRows);
      imports.push({
        sourceKey: structured.source.sourceKey,
        category: structured.source.category,
        rows: structured.quality.rowCount,
        labs: structured.labs.map((lab) => lab.standardName),
        status: "imported"
      });
    }
  } finally {
    connection.release();
    await pool.end();
  }
  const report = { generatedAt: new Date().toISOString(), database: "MySQL/AMPPS", imports };
  await writeJson(path.join(reportsRoot, "import-report.json"), report);
  await writeJson(path.join(processedRoot, "import-report.json"), report);
  console.log(`Controlled Kaggle import completed for ${imports.length} datasets.`);
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(`Controlled Kaggle import failed: ${error.message}`);
  process.exit(1);
});
