import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractedRoot, extractZipEntry, parseCsv, rawRoot, readJson, reportsRoot, safeName, standardLabName, validatedRoot, writeJson, zipEntries } from "./common.js";

function clinicalCsvScore(rows) {
  const headers = Object.keys(rows[0] || {});
  const labCount = headers.filter((header) => standardLabName(header)).length;
  const numericCount = headers.filter((header) => rows.slice(0, 50).some((row) => Number.isFinite(Number.parseFloat(String(row[header]).replace(/[^0-9.+-]/g, ""))))).length;
  return { labCount, numericCount, headerCount: headers.length };
}

async function main() {
  const downloadReport = await readJson(path.join(rawRoot, "download-report.json"));
  if (!downloadReport?.downloads?.length) throw new Error("Run npm run kaggle:pipeline:download before validation.");
  const validations = [];

  for (const dataset of downloadReport.downloads.filter((item) => item.status === "downloaded")) {
    const datasetRoot = path.join(extractedRoot, safeName(dataset.ref));
    await mkdir(datasetRoot, { recursive: true });
    const buffer = await readFile(dataset.rawPath);
    const files = [];
    const rejectedFiles = [];
    for (const entry of zipEntries(buffer)) {
      if (entry.name.endsWith("/")) continue;
      const lower = entry.name.toLowerCase();
      if (!lower.endsWith(".csv")) {
        rejectedFiles.push({ name: entry.name, reason: "not csv" });
        continue;
      }
      const outputPath = path.join(datasetRoot, entry.name.split("/").map(safeName).join(path.sep));
      await mkdir(path.dirname(outputPath), { recursive: true });
      const data = extractZipEntry(buffer, entry);
      await writeFile(outputPath, data);
      const rows = parseCsv(data.toString("utf8"));
      const score = clinicalCsvScore(rows);
      const missingCells = rows.reduce((count, row) => count + Object.values(row).filter((value) => !String(value || "").trim()).length, 0);
      const totalCells = rows.length * Math.max(score.headerCount, 1);
      const missingRate = totalCells ? missingCells / totalCells : 1;
      files.push({
        path: outputPath,
        name: entry.name,
        bytes: data.length,
        rows: rows.length,
        missingRate,
        ...score,
        valid: rows.length > 0 && score.headerCount >= 2 && score.numericCount > 0
      });
    }
    const acceptedFiles = files.filter((file) => file.valid);
    validations.push({
      ...dataset,
      extractedPath: datasetRoot,
      files,
      rejectedFiles,
      status: acceptedFiles.length ? "validated" : "rejected-unclear-schema",
      rejectionReason: acceptedFiles.length ? null : "No valid clinical CSV file with numeric columns was found."
    });
  }

  const report = { generatedAt: new Date().toISOString(), datasets: validations };
  await writeJson(path.join(validatedRoot, "validation-report.json"), report);
  await writeJson(path.join(reportsRoot, "validation-report.json"), report);
  console.log(`Controlled Kaggle validation accepted ${validations.filter((item) => item.status === "validated").length} datasets.`);
}

main().catch((error) => {
  console.error(`Controlled Kaggle validation failed: ${error.message}`);
  process.exit(1);
});
