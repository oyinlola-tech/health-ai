import fs from "node:fs/promises";
import { errors } from "../../utils/errors.js";

const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

async function loadPdfParse() {
  try {
    const module = await import("pdf-parse");
    return module.default || module;
  } catch {
    throw errors.config("PDF extraction requires the pdf-parse package to be installed.");
  }
}

async function loadTesseract() {
  try {
    const module = await import("tesseract.js");
    return module.default || module;
  } catch {
    throw errors.config("Image OCR requires the tesseract.js package to be installed.");
  }
}

function normalizeExtractedText(text) {
  return String(text || "")
    .split(String.fromCharCode(0))
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function confidenceFromText(text, sourceConfidence = null) {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return 0;
  const alphanumeric = normalized.replace(/[^a-z0-9]/gi, "").length;
  const ratio = alphanumeric / Math.max(normalized.length, 1);
  const lengthScore = Math.min(35, Math.floor(normalized.length / 80));
  const qualityScore = Math.min(35, Math.floor(ratio * 45));
  const ocrScore = sourceConfidence === null ? 20 : Math.round(sourceConfidence * 0.3);
  return Math.max(1, Math.min(100, lengthScore + qualityScore + ocrScore));
}

async function extractPdfText(filePath) {
  const pdfParse = await loadPdfParse();
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);
  const text = normalizeExtractedText(parsed.text);
  return {
    text,
    ocrConfidence: confidenceFromText(text),
    pageCount: parsed.numpages || null,
    method: "pdf-text"
  };
}

async function extractImageText(filePath, language) {
  const tesseract = await loadTesseract();
  const result = await tesseract.recognize(filePath, language);
  const text = normalizeExtractedText(result?.data?.text);
  return {
    text,
    ocrConfidence: confidenceFromText(text, result?.data?.confidence ?? null),
    pageCount: 1,
    method: "image-ocr"
  };
}

export const ocrService = {
  async extractText({ filePath, mimeType, language = "eng" }) {
    if (mimeType === "application/pdf") return extractPdfText(filePath);
    if (imageMimeTypes.has(mimeType)) return extractImageText(filePath, language);
    throw errors.badRequest(`Unsupported report file type for extraction: ${mimeType}`);
  }
};
