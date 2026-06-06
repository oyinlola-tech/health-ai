import { pool } from "../../config/database.js";
import { abnormalityLevels } from "../report-processing/abnormalResultDetector.js";
import { medicalKnowledgeBase } from "./medicalKnowledgeBase.js";

const criticalRatio = 0.25;

const fallbackRanges = {
  hemoglobin: { min: 13.5, max: 17.5, unit: "g/dL", displayName: "Hemoglobin" },
  wbc: { min: 4.0, max: 11.0, unit: "10^3/uL", displayName: "WBC" },
  rbc: { min: 4.5, max: 5.9, unit: "10^6/uL", displayName: "RBC" },
  platelets: { min: 150, max: 450, unit: "10^3/uL", displayName: "Platelets" },
  glucose: { min: 70, max: 99, unit: "mg/dL", displayName: "Glucose" },
  creatinine: { min: 0.7, max: 1.3, unit: "mg/dL", displayName: "Creatinine" },
  urea: { min: 7, max: 20, unit: "mg/dL", displayName: "Urea" },
  alt: { min: 7, max: 56, unit: "IU/L", displayName: "ALT" },
  ast: { min: 10, max: 40, unit: "IU/L", displayName: "AST" },
  tsh: { min: 0.4, max: 4.0, unit: "mIU/L", displayName: "TSH" },
  hdl: { min: 40, max: null, unit: "mg/dL", displayName: "HDL" },
  ldl: { min: null, max: 100, unit: "mg/dL", displayName: "LDL" },
  cholesterol: { min: null, max: 200, unit: "mg/dL", displayName: "Cholesterol" }
};

const aliases = new Map([
  ["hemoglobin", ["hemoglobin", "haemoglobin", "hgb", "hb"]],
  ["wbc", ["wbc", "white blood cell", "white blood cells"]],
  ["rbc", ["rbc", "red blood cell", "red blood cells"]],
  ["platelets", ["platelets", "platelet count"]],
  ["glucose", ["glucose", "blood glucose", "blood sugar"]],
  ["creatinine", ["creatinine", "serum creatinine"]],
  ["urea", ["urea", "bun", "blood urea nitrogen"]],
  ["alt", ["alt", "sgpt", "alanine aminotransferase"]],
  ["ast", ["ast", "sgot", "aspartate aminotransferase"]],
  ["tsh", ["tsh", "thyroid stimulating hormone"]],
  ["hdl", ["hdl", "hdl cholesterol"]],
  ["ldl", ["ldl", "ldl cholesterol"]],
  ["cholesterol", ["cholesterol", "total cholesterol"]]
]);

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function standardLabName(name) {
  const normalized = normalizeName(name);
  for (const [standard, names] of aliases) {
    if (names.some((alias) => normalized === normalizeName(alias) || normalized.includes(normalizeName(alias)))) return standard;
  }
  return normalized.replaceAll(" ", "_");
}

function numeric(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function classify(value, min, max) {
  if (value === null || (min === null && max === null)) return abnormalityLevels.UNKNOWN;
  if (min !== null && value < min) {
    const critical = min - Math.abs(min) * criticalRatio;
    return value <= critical ? abnormalityLevels.CRITICAL_LOW : abnormalityLevels.LOW;
  }
  if (max !== null && value > max) {
    const critical = max + Math.abs(max) * criticalRatio;
    return value >= critical ? abnormalityLevels.CRITICAL_HIGH : abnormalityLevels.HIGH;
  }
  return abnormalityLevels.NORMAL;
}

function simpleExplanation({ displayName, status, value, unit, min, max }) {
  const valueText = `${value}${unit ? ` ${unit}` : ""}`;
  const rangeText =
    min !== null && max !== null
      ? `${min} - ${max}${unit ? ` ${unit}` : ""}`
      : min !== null
        ? `above ${min}${unit ? ` ${unit}` : ""}`
        : max !== null
          ? `below ${max}${unit ? ` ${unit}` : ""}`
          : "not available";

  if (status === abnormalityLevels.NORMAL) return `${displayName} is within the available reference range (${rangeText}).`;
  if (status === abnormalityLevels.LOW) return `${displayName} is below the available reference range. This can have several causes and should be reviewed with a clinician in context.`;
  if (status === abnormalityLevels.HIGH) return `${displayName} is above the available reference range. This can have several causes and should be reviewed with a clinician in context.`;
  if (status === abnormalityLevels.CRITICAL_LOW) return `${displayName} is far below the available reference range. Please contact a qualified healthcare professional promptly for guidance.`;
  if (status === abnormalityLevels.CRITICAL_HIGH) return `${displayName} is far above the available reference range. Please contact a qualified healthcare professional promptly for guidance.`;
  return `${displayName} was reported as ${valueText}, but a reliable reference range was not available for deterministic classification.`;
}

async function referenceFor(result, client) {
  const standard = standardLabName(result.testName || result.name || result.standardName);
  const explicitMin = numeric(result.referenceMin);
  const explicitMax = numeric(result.referenceMax);
  if (explicitMin !== null || explicitMax !== null) {
    return {
      standard,
      displayName: result.testName || fallbackRanges[standard]?.displayName || standard.toUpperCase(),
      min: explicitMin,
      max: explicitMax,
      unit: result.unit || fallbackRanges[standard]?.unit || null,
      source: "report_reference_range"
    };
  }

  const ranges = await medicalKnowledgeBase.labReferenceRanges(standard, client);
  const range = ranges.find((item) => item.standard_name === standard) || ranges[0];
  if (range) {
    return {
      standard,
      displayName: range.test_name || fallbackRanges[standard]?.displayName || standard.toUpperCase(),
      min: numeric(range.observed_min),
      max: numeric(range.observed_max),
      unit: result.unit || range.unit || fallbackRanges[standard]?.unit || null,
      source: range.dataset_url || "lab_reference_ranges"
    };
  }

  const fallback = fallbackRanges[standard];
  return {
    standard,
    displayName: result.testName || fallback?.displayName || standard.toUpperCase(),
    min: fallback?.min ?? null,
    max: fallback?.max ?? null,
    unit: result.unit || fallback?.unit || null,
    source: fallback ? "built_in_general_reference" : null
  };
}

export const labInterpretationEngine = {
  async interpret(labResults, { patientContext = {}, client = pool } = {}) {
    const interpretations = [];
    for (const result of labResults || []) {
      const value = numeric(result.value);
      const reference = await referenceFor(result, client);
      const status = classify(value, reference.min, reference.max);
      interpretations.push({
        testName: reference.displayName,
        standardName: reference.standard,
        value,
        unit: reference.unit,
        referenceMin: reference.min,
        referenceMax: reference.max,
        status,
        flag: status,
        isAbnormal: ![abnormalityLevels.NORMAL, abnormalityLevels.UNKNOWN].includes(status),
        isCritical: [abnormalityLevels.CRITICAL_LOW, abnormalityLevels.CRITICAL_HIGH].includes(status),
        explanation: simpleExplanation({ ...reference, status, value, unit: reference.unit, min: reference.min, max: reference.max }),
        source: reference.source,
        patientContext
      });
    }
    return interpretations;
  },

  classify
};
