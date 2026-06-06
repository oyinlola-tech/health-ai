import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

export const projectRoot = path.resolve(".");
export const manifestPath = path.resolve("scripts/kaggle/datasets.manifest.json");
export const rawRoot = path.resolve("datasets/raw");
export const extractedRoot = path.resolve("datasets/extracted");
export const processedRoot = path.resolve("datasets/processed");
export const reportPath = path.resolve("docs/data/kaggle-datasets-report.md");

export function safeName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "");
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

export async function ensureDataDirs() {
  await Promise.all([
    mkdir(rawRoot, { recursive: true }),
    mkdir(extractedRoot, { recursive: true }),
    mkdir(processedRoot, { recursive: true }),
    mkdir(path.dirname(reportPath), { recursive: true })
  ]);
}

export async function readManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export async function fileSize(filePath) {
  const info = await stat(filePath).catch(() => null);
  return info?.size || 0;
}

export async function directorySize(root) {
  let total = 0;
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) total += await directorySize(full);
    if (entry.isFile()) total += await fileSize(full);
  }
  return total;
}

export async function kaggleCredentials() {
  if (process.env.KAGGLE_USERNAME && process.env.KAGGLE_KEY) {
    return { username: process.env.KAGGLE_USERNAME, key: process.env.KAGGLE_KEY };
  }

  const candidates = [
    path.resolve(".kaggle/kaggle.json"),
    path.resolve("kaggle.json"),
    path.join(os.homedir(), ".kaggle", "kaggle.json")
  ];

  for (const candidate of candidates) {
    const parsed = await readJson(candidate);
    if (parsed?.username && parsed?.key) return parsed;
  }

  throw new Error("Kaggle credentials not found. Set KAGGLE_USERNAME/KAGGLE_KEY or provide .kaggle/kaggle.json.");
}

export function kaggleHeaders(credentials) {
  const token = Buffer.from(`${credentials.username}:${credentials.key}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

export async function kaggleRequest(endpoint, credentials, { timeoutMs = 60000, retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`https://www.kaggle.com/api/v1/${endpoint}`, {
        headers: kaggleHeaders(credentials),
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) throw new Error(`Kaggle API ${endpoint} failed with HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    }
  }
  throw lastError;
}

export async function datasetMetadata(ref, credentials) {
  return kaggleRequest(`datasets/view/${ref}`, credentials).then((response) => response.json());
}

export async function searchDatasets(query, credentials) {
  const url = `datasets/list?search=${encodeURIComponent(query)}&fileType=csv&sortBy=hottest&pageSize=10`;
  return kaggleRequest(url, credentials).then((response) => response.json());
}

export function zipEntries(buffer) {
  const entries = [];
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end of central directory was not found.");

  const count = buffer.readUInt16LE(eocd + 10);
  let centralOffset = buffer.readUInt32LE(eocd + 16);
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("Invalid ZIP central directory.");
    const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8");
    entries.push({ name, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function extractZipEntry(buffer, entry) {
  if (buffer.readUInt32LE(entry.localHeaderOffset) !== 0x04034b50) throw new Error("Invalid ZIP local file header.");
  const nameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.name}.`);
}

export function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (character === "\"" && next === "\"") {
        value += "\"";
        index += 1;
      } else if (character === "\"") {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (character !== "\r") {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((header, index) => header.trim() || `column_${index + 1}`);
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || "").trim()])));
}

export function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
