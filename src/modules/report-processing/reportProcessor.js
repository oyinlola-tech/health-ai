import { env } from "../../config/env.js";
import { detectAbnormalResults } from "./abnormalResultDetector.js";
import { extractMedicalEntities } from "./entityExtractionService.js";
import { parseLabValues } from "./labValueParser.js";
import { ocrService } from "./ocrService.js";

function completenessScore({ text, labResults, entities }) {
  let score = 0;
  if (text.length >= 200) score += 20;
  if (text.length >= 600) score += 10;
  if (labResults.length > 0) score += 25;
  if (labResults.some((result) => result.referenceMin !== null || result.referenceMax !== null)) score += 15;
  if (entities.biomarkers.length > 0 || entities.testNames.length > 0) score += 15;
  if (entities.referenceRanges.length > 0) score += 10;
  if (entities.units.length > 0) score += 5;
  return Math.min(100, score);
}

function calculateConfidence({ ocrConfidence, text, labResults, entities }) {
  const extractionScore = completenessScore({ text, labResults, entities });
  return Math.round(ocrConfidence * 0.5 + extractionScore * 0.5);
}

export async function processReportFile({ filePath, mimeType }) {
  const extraction = await ocrService.extractText({
    filePath,
    mimeType,
    language: env.OCR_LANGUAGE
  });

  const labResults = detectAbnormalResults(parseLabValues(extraction.text));
  const entities = extractMedicalEntities(extraction.text, labResults);
  const confidence = calculateConfidence({
    ocrConfidence: extraction.ocrConfidence,
    text: extraction.text,
    labResults,
    entities
  });

  return {
    extractedText: extraction.text,
    extractionMethod: extraction.method,
    pageCount: extraction.pageCount,
    ocrConfidence: extraction.ocrConfidence,
    medicalEntities: entities,
    labResults,
    analysisConfidence: confidence,
    processingVersion: env.REPORT_PROCESSING_VERSION
  };
}
