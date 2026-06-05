# Medical Extraction Report

## Scope

Medical extraction now runs on actual OCR/PDF text and stores structured output on the report row.

Implemented files:

- `src/modules/report-processing/entityExtractionService.js`
- `src/modules/report-processing/labValueParser.js`
- `src/modules/report-processing/abnormalResultDetector.js`
- `src/services/aiService.js`
- `src/repositories/reportRepository.js`

## Extracted Structures

The entity layer extracts:

- Diseases
- Conditions
- Medications
- Symptoms
- Biomarkers
- Test names
- Reference ranges
- Units

The lab parser extracts values shaped like:

```json
{
  "testName": "Hemoglobin",
  "value": 10.2,
  "unit": "g/dL",
  "referenceMin": 13,
  "referenceMax": 17
}
```

## Abnormal Detection

Lab values are classified as:

- `LOW`
- `NORMAL`
- `HIGH`
- `CRITICAL_LOW`
- `CRITICAL_HIGH`
- `UNKNOWN`

Critical flags are persisted in `lab_results_json` and are passed into the Gemini prompt as structured context.

## Confidence

Extraction confidence is calculated from:

- OCR text quality
- Extracted text length
- Lab parsing success
- Reference range detection
- Medical entity detection

The resulting `analysis_confidence` is stored on `reports` from 0 to 100.

## AI Schema

Gemini responses must validate against this JSON schema before saving:

```json
{
  "summary": "",
  "keyFindings": [],
  "abnormalResults": [],
  "possibleExplanations": [],
  "recommendedQuestions": [],
  "urgencyLevel": "LOW",
  "seekMedicalAttention": false
}
```

Malformed responses are rejected and the report analysis is marked failed.

