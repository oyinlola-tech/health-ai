import { knownBiomarkers } from "./labValueParser.js";

const diseaseTerms = [
  "anemia",
  "anaemia",
  "diabetes",
  "hypertension",
  "hypothyroidism",
  "hyperthyroidism",
  "infection",
  "kidney disease",
  "liver disease",
  "malaria",
  "hepatitis",
  "pneumonia"
];

const symptomTerms = [
  "fever",
  "fatigue",
  "pain",
  "cough",
  "dizziness",
  "nausea",
  "vomiting",
  "shortness of breath",
  "headache",
  "weakness"
];

const medicationPattern = /\b(?:tablet|capsule|injection|syrup|cream|drops)\s+([A-Z][A-Za-z0-9-]{2,})|\b([A-Z][a-z]+(?:cillin|mycin|prazole|statin|formin|sartan|olol|pril))\b/g;
const rangePattern = /(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(-?\d+(?:\.\d+)?)\s*(mg\/dL|mmol\/L|g\/dL|ng\/mL|pg\/mL|mIU\/L|IU\/L|U\/L|%|fL|pg)?/gi;

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function findTerms(text, terms) {
  const lowerText = text.toLowerCase();
  return terms.filter((term) => lowerText.includes(term));
}

function findMedications(text) {
  const medications = [];
  for (const match of text.matchAll(medicationPattern)) {
    medications.push(match[1] || match[2]);
  }
  return unique(medications);
}

function findReferenceRanges(text) {
  return [...text.matchAll(rangePattern)].map((match) => ({
    referenceMin: Number.parseFloat(match[1]),
    referenceMax: Number.parseFloat(match[2]),
    unit: match[3] || null,
    rawText: match[0]
  }));
}

export function extractMedicalEntities(text, labResults = []) {
  const normalizedText = String(text || "");
  const biomarkersFromText = findTerms(normalizedText, knownBiomarkers());
  const testNames = labResults.map((result) => result.testName);

  return {
    diseases: unique(findTerms(normalizedText, diseaseTerms)),
    conditions: unique(findTerms(normalizedText, diseaseTerms)),
    medications: findMedications(normalizedText),
    symptoms: unique(findTerms(normalizedText, symptomTerms)),
    biomarkers: unique([...biomarkersFromText, ...testNames]),
    testNames: unique(testNames),
    referenceRanges: findReferenceRanges(normalizedText),
    units: unique(labResults.map((result) => result.unit))
  };
}
