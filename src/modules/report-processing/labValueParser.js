const commonBiomarkers = [
  "hemoglobin",
  "haemoglobin",
  "glucose",
  "cholesterol",
  "hdl",
  "ldl",
  "triglycerides",
  "creatinine",
  "urea",
  "sodium",
  "potassium",
  "chloride",
  "calcium",
  "magnesium",
  "platelets",
  "white blood cell",
  "wbc",
  "red blood cell",
  "rbc",
  "hematocrit",
  "haematocrit",
  "alt",
  "ast",
  "bilirubin",
  "albumin",
  "tsh",
  "vitamin d",
  "ferritin",
  "crp",
  "esr"
];

const unitsPattern = String.raw`(?:mg\/dL|mmol\/L|g\/dL|ng\/mL|pg\/mL|mIU\/L|IU\/L|U\/L|x10\^9\/L|10\^9\/L|%|fL|pg|mmHg|bpm)`;
const valuePattern = String.raw`([<>]?\s*-?\d+(?:\.\d+)?)`;
const rangePattern = String.raw`(?:reference|ref\.?|normal|range)?\s*[:=]?\s*\(?\s*(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(-?\d+(?:\.\d+)?)\s*\)?`;
const lineExpression = new RegExp(
  String.raw`^\s*([A-Za-z][A-Za-z0-9 ()/%.,+-]{1,80}?)\s*[:=\t ]+\s*${valuePattern}\s*(${unitsPattern})?\s*(?:${rangePattern})?`,
  "i"
);

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).replace(/[<>\s]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTestName(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[:=]+$/, "")
    .trim();
}

function lineLooksMedical(name) {
  const lower = name.toLowerCase();
  if (commonBiomarkers.some((biomarker) => lower.includes(biomarker))) return true;
  return lower.length <= 40 && !/\b(date|time|age|name|address|phone|invoice|page)\b/i.test(lower);
}

export function parseLabValues(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results = [];
  for (const line of lines) {
    const match = line.match(lineExpression);
    if (!match) continue;

    const testName = normalizeTestName(match[1]);
    if (!lineLooksMedical(testName)) continue;

    const value = normalizeNumber(match[2]);
    if (value === null) continue;

    results.push({
      testName,
      value,
      unit: match[3] || null,
      referenceMin: normalizeNumber(match[4]),
      referenceMax: normalizeNumber(match[5]),
      rawText: line
    });
  }

  return dedupeResults(results);
}

function dedupeResults(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = `${result.testName.toLowerCase()}|${result.value}|${result.unit || ""}|${result.referenceMin || ""}|${result.referenceMax || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function knownBiomarkers() {
  return [...commonBiomarkers];
}
