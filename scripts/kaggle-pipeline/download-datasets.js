import { writeFile } from "node:fs/promises";
import path from "node:path";
import { directorySize, ensurePipelineDirs, kaggleCredentials, kaggleRequest, maxTotalDownloadBytes, rawRoot, readJson, reportsRoot, safeName, searchRoot, writeJson } from "./common.js";

async function main() {
  await ensurePipelineDirs();
  const selection = await readJson(path.join(searchRoot, "selection-report.json"));
  if (!selection?.selected?.length) throw new Error("Run npm run kaggle:pipeline:select before downloading datasets.");
  const credentials = await kaggleCredentials();
  const downloads = [];

  for (const dataset of selection.selected) {
    const projectedSize = (await directorySize(rawRoot)) + Number(dataset.totalBytes || 0);
    const rawPath = path.join(rawRoot, `${safeName(dataset.ref)}.zip`);
    if (Number(dataset.totalBytes || 0) > 1024 * 1024 * 1024 || projectedSize > maxTotalDownloadBytes) {
      downloads.push({ ...dataset, rawPath, status: "rejected-size-limit" });
      continue;
    }
    const response = await kaggleRequest(`datasets/download/${dataset.ref}`, credentials);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(rawPath, buffer);
    downloads.push({ ...dataset, rawPath, downloadedAt: new Date().toISOString(), downloadedBytes: buffer.length, status: "downloaded" });
  }

  const report = { generatedAt: new Date().toISOString(), maxTotalDownloadBytes, totalRawBytes: await directorySize(rawRoot), downloads };
  await writeJson(path.join(rawRoot, "download-report.json"), report);
  await writeJson(path.join(reportsRoot, "download-report.json"), report);
  console.log(`Controlled Kaggle download completed for ${downloads.filter((item) => item.status === "downloaded").length} datasets.`);
}

main().catch((error) => {
  console.error(`Controlled Kaggle download failed: ${error.message}`);
  process.exit(1);
});
