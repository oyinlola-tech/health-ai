import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureDataDirs,
  extractZipEntry,
  extractedRoot,
  rawRoot,
  readJson,
  safeName,
  writeJson,
  zipEntries
} from "./common.js";

async function main() {
  await ensureDataDirs();
  const downloadReport = await readJson(path.join(rawRoot, "download-report.json"), { datasets: [] });
  const extraction = [];

  for (const dataset of downloadReport.datasets.filter((item) => item.status === "downloaded")) {
    const datasetRoot = path.join(extractedRoot, safeName(dataset.resolvedRef));
    await mkdir(datasetRoot, { recursive: true });
    const buffer = await readFile(dataset.rawPath);
    const files = [];

    for (const entry of zipEntries(buffer)) {
      if (entry.name.endsWith("/")) continue;
      const outputPath = path.join(datasetRoot, entry.name.split("/").map(safeName).join(path.sep));
      await mkdir(path.dirname(outputPath), { recursive: true });
      const data = extractZipEntry(buffer, entry);
      await writeFile(outputPath, data);
      files.push({ path: outputPath, name: entry.name, bytes: data.length });
    }

    extraction.push({
      ...dataset,
      extractedPath: datasetRoot,
      files,
      status: "extracted"
    });
  }

  await writeJson(path.join(extractedRoot, "extraction-report.json"), {
    generatedAt: new Date().toISOString(),
    datasets: extraction
  });
  console.log(`Kaggle extraction report written for ${extraction.length} datasets.`);
}

main().catch((error) => {
  console.error(`Kaggle extraction failed: ${error.message}`);
  process.exit(1);
});
