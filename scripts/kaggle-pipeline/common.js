import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { JSDOM } from "jsdom";

export const projectRoot = path.resolve(".");
export const pipelineRoot = path.resolve("datasets/kaggle-pipeline");
export const searchRoot = path.join(pipelineRoot, "search");
export const rawRoot = path.join(pipelineRoot, "raw");
export const extractedRoot = path.join(pipelineRoot, "extracted");
export const validatedRoot = path.join(pipelineRoot, "validated");
export const processedRoot = path.join(pipelineRoot, "processed");
export const reportsRoot = path.join(pipelineRoot, "reports");

export const maxDatasetBytes = 1024 * 1024 * 1024;
export const maxTotalDownloadBytes = 5 * 1024 * 1024 * 1024;

export const allowedCategories = {
  blood_tests: {
    label: "Blood test datasets",
    curatedRefs: ["vizeno/complete-blood-count-cbc-dataset"],
    queries: ["complete blood count dataset", "cbc blood test csv", "cholesterol lipid profile dataset", "glucose blood test dataset"],
    requiredLabs: ["hemoglobin", "wbc", "rbc", "platelets", "glucose", "hdl", "ldl"],
    positive: ["blood", "cbc", "complete blood", "hemoglobin", "platelet", "glucose", "cholesterol", "lipid", "hdl", "ldl"],
    negative: ["image", "xray", "mri", "survey", "mental", "insurance", "fitness"]
  },
  diabetes: {
    label: "Diabetes datasets",
    curatedRefs: ["uciml/pima-indians-diabetes-database"],
    queries: ["diabetes medical dataset", "diabetes clinical dataset csv"],
    requiredLabs: ["glucose"],
    positive: ["diabetes", "glucose", "insulin", "clinical"],
    negative: ["image", "retinopathy image", "survey", "twitter"]
  },
  kidney_disease: {
    label: "Kidney disease datasets",
    curatedRefs: ["mansoordaku/ckdisease"],
    queries: ["kidney disease clinical dataset", "chronic kidney disease csv"],
    requiredLabs: ["creatinine", "urea"],
    positive: ["kidney", "renal", "creatinine", "urea", "ckd"],
    negative: ["image", "stone image", "survey"]
  },
  liver_function: {
    label: "Liver function datasets",
    curatedRefs: ["uciml/indian-liver-patient-records"],
    queries: ["liver function test dataset", "liver disease clinical dataset csv"],
    requiredLabs: ["alt", "ast"],
    positive: ["liver", "bilirubin", "alkaline", "sgpt", "sgot", "alt", "ast"],
    negative: ["image", "ct scan", "survey"]
  },
  heart_disease: {
    label: "Heart disease datasets",
    curatedRefs: ["johnsmith88/heart-disease-dataset"],
    queries: ["heart disease clinical dataset csv", "heart disease medical dataset"],
    requiredLabs: ["cholesterol"],
    positive: ["heart", "cardio", "cholesterol", "chest pain", "clinical"],
    negative: ["ecg image", "image", "sound", "survey"]
  },
  thyroid: {
    label: "Thyroid datasets",
    curatedRefs: ["emmanuelfwerr/thyroid-disease-data"],
    queries: ["thyroid disease clinical dataset", "thyroid function test dataset csv"],
    requiredLabs: ["tsh"],
    positive: ["thyroid", "tsh", "t3", "t4"],
    negative: ["image", "ultrasound", "survey"]
  }
};

export const labAliases = new Map([
  ["hemoglobin", ["hemoglobin", "haemoglobin", "hgb", "hb"]],
  ["wbc", ["wbc", "white blood cell", "white blood cells", "white_blood_cell_count", "wc"]],
  ["rbc", ["rbc", "red blood cell", "red blood cells", "red_blood_cell_count", "rc"]],
  ["platelets", ["platelets", "platelet", "platelet_count", "pc"]],
  ["glucose", ["glucose", "blood glucose", "blood sugar", "sugar"]],
  ["creatinine", ["creatinine", "serum creatinine", "sc"]],
  ["urea", ["urea", "blood urea", "bun", "blood urea nitrogen"]],
  ["alt", ["alt", "sgpt", "alanine aminotransferase", "alamine aminotransferase"]],
  ["ast", ["ast", "sgot", "aspartate aminotransferase"]],
  ["tsh", ["tsh", "thyroid stimulating hormone"]],
  ["hdl", ["hdl", "hdl cholesterol"]],
  ["ldl", ["ldl", "ldl cholesterol"]],
  ["cholesterol", ["cholesterol", "serum cholesterol", "total cholesterol"]]
]);

export const defaultUnits = {
  hemoglobin: "g/dL",
  wbc: "10^3/uL",
  rbc: "10^6/uL",
  platelets: "10^3/uL",
  glucose: "mg/dL",
  creatinine: "mg/dL",
  urea: "mg/dL",
  alt: "IU/L",
  ast: "IU/L",
  tsh: "mIU/L",
  hdl: "mg/dL",
  ldl: "mg/dL",
  cholesterol: "mg/dL"
};

export const labExplanations = {
  hemoglobin: "Hemoglobin carries oxygen in red blood cells and is commonly reviewed for anemia patterns.",
  wbc: "White blood cell count helps describe immune activity and possible infection or inflammation patterns.",
  rbc: "Red blood cell count describes oxygen-carrying blood cells and is reviewed with hemoglobin and hematocrit.",
  platelets: "Platelets help blood clot and are commonly reviewed in complete blood count panels.",
  glucose: "Glucose measures blood sugar and is commonly used in diabetes screening and monitoring.",
  creatinine: "Creatinine is commonly used as a kidney filtration marker.",
  urea: "Urea or BUN reflects nitrogen waste handling and can relate to kidney function or hydration status.",
  alt: "ALT is a liver enzyme commonly reviewed for liver cell irritation or injury.",
  ast: "AST is an enzyme found in liver, heart, and muscle tissue and is often interpreted with ALT.",
  tsh: "TSH is used to evaluate thyroid signaling and thyroid function patterns.",
  hdl: "HDL cholesterol is reviewed as part of cardiovascular risk assessment.",
  ldl: "LDL cholesterol is reviewed as part of cardiovascular risk assessment.",
  cholesterol: "Total cholesterol is a lipid marker commonly reviewed with HDL and LDL."
};

export function safeName(value) {
  return String(value || "dataset").replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "");
}

export function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function canonicalColumnName(value) {
  return normalizeName(value).replaceAll(" ", "_");
}

export function standardLabName(column) {
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

export function numberValue(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

export async function ensurePipelineDirs() {
  await Promise.all([searchRoot, rawRoot, extractedRoot, validatedRoot, processedRoot, reportsRoot, path.resolve("docs/data")].map((dir) => mkdir(dir, { recursive: true })));
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
  if (process.env.KAGGLE_USERNAME && process.env.KAGGLE_KEY) return { username: process.env.KAGGLE_USERNAME, key: process.env.KAGGLE_KEY };
  const candidates = [path.resolve(".kaggle/kaggle.json"), path.resolve("kaggle.json"), path.join(os.homedir(), ".kaggle", "kaggle.json")];
  for (const candidate of candidates) {
    const parsed = await readJson(candidate);
    if (parsed?.username && parsed?.key) return parsed;
  }
  throw new Error("Kaggle credentials not found. Set KAGGLE_USERNAME/KAGGLE_KEY or provide .kaggle/kaggle.json.");
}

export function kaggleHeaders(credentials) {
  return { Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.key}`).toString("base64")}` };
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

export async function searchDatasets(query, credentials) {
  return kaggleRequest(`datasets/list?search=${encodeURIComponent(query)}&fileType=csv&sortBy=hottest&pageSize=20`, credentials).then((response) => response.json());
}

export async function datasetMetadata(ref, credentials) {
  return kaggleRequest(`datasets/view/${ref}`, credentials).then((response) => response.json());
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
  const document = new JSDOM(`<!doctype html><body>${String(value || "")}</body>`).window.document;
  return String(document.body.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}
