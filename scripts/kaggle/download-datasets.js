import path from "node:path";
import { writeFile } from "node:fs/promises";
import {
  datasetMetadata,
  directorySize,
  ensureDataDirs,
  kaggleCredentials,
  kaggleRequest,
  rawRoot,
  readManifest,
  safeName,
  searchDatasets,
  writeJson
} from "./common.js";

async function resolveDataset(entry, credentials) {
  try {
    const metadata = await datasetMetadata(entry.ref, credentials);
    return { ...entry, resolvedRef: entry.ref, metadata, status: "metadata-found" };
  } catch (error) {
    const matches = await searchDatasets(entry.search || entry.category, credentials).catch(() => []);
    const match = matches.find((dataset) => Number(dataset.totalBytes || 0) < 1024 * 1024 * 1024) || matches[0];
    if (!match?.ref) return { ...entry, resolvedRef: entry.ref, status: "metadata-failed", error: error.message };
    const metadata = await datasetMetadata(match.ref, credentials);
    return { ...entry, resolvedRef: match.ref, metadata, status: "fallback-found", fallbackFrom: entry.ref };
  }
}

function sourceRecord(entry, rawPath, status, error = null) {
  const metadata = entry.metadata || {};
  return {
    category: entry.category,
    priority: entry.priority,
    required: entry.required,
    requestedRef: entry.ref,
    resolvedRef: entry.resolvedRef || entry.ref,
    title: metadata.title || metadata.datasetName || entry.resolvedRef || entry.ref,
    author: metadata.ownerName || metadata.creatorName || metadata.ownerRef || null,
    url: metadata.url || `https://www.kaggle.com/datasets/${entry.resolvedRef || entry.ref}`,
    license: metadata.licenseName || metadata.license || null,
    totalBytes: Number(metadata.totalBytes || metadata.size || 0),
    rawPath,
    status,
    error,
    downloadedAt: status === "downloaded" ? new Date().toISOString() : null
  };
}

async function main() {
  await ensureDataDirs();
  const manifest = await readManifest();
  const credentials = await kaggleCredentials();
  const report = [];

  for (const entry of manifest.datasets) {
    const resolved = await resolveDataset(entry, credentials);
    const refName = safeName(resolved.resolvedRef || entry.ref);
    const rawPath = path.join(rawRoot, `${refName}.zip`);
    const projectedSize = (await directorySize(rawRoot)) + Number(resolved.metadata?.totalBytes || 0);

    if (projectedSize > manifest.maxTotalDownloadBytes) {
      report.push(sourceRecord(resolved, rawPath, "skipped-size-limit", "Total download size would exceed 5 GB."));
      continue;
    }

    try {
      const response = await kaggleRequest(`datasets/download/${resolved.resolvedRef}`, credentials);
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(rawPath, buffer);
      await writeJson(path.join(rawRoot, `${refName}.metadata.json`), resolved.metadata || {});
      report.push(sourceRecord(resolved, rawPath, "downloaded"));
    } catch (error) {
      report.push(sourceRecord(resolved, rawPath, "download-failed", error.message));
    }
  }

  await writeJson(path.join(rawRoot, "download-report.json"), {
    generatedAt: new Date().toISOString(),
    totalRawBytes: await directorySize(rawRoot),
    maxTotalDownloadBytes: manifest.maxTotalDownloadBytes,
    datasets: report
  });
  console.log(`Kaggle download report written for ${report.length} datasets.`);
}

main().catch((error) => {
  console.error(`Kaggle download failed: ${error.message}`);
  process.exit(1);
});
