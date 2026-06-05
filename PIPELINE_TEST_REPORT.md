# Pipeline Test Report

## Commands Run

```bash
npm.cmd test
npm.cmd run lint
```

## Result

- Test files: 3 passed, 1 skipped
- Tests: 10 passed, 10 skipped
- Lint: passed

## Coverage Added

Added:

- `tests/ocrService.test.js`
- `tests/reportProcessing.test.js`

Updated:

- `tests/aiService.test.js`

## Verified Behavior

- OCR service rejects unsupported MIME types.
- Lab parser extracts test names, values, units, and reference ranges.
- Abnormal detector classifies normal, low, and critical high values.
- Entity extraction finds conditions, symptoms, biomarkers, and units from extracted content.
- Report processor turns extracted content into structured lab values, flags, entities, and confidence.
- Pipeline persists extraction failures with the safe message: `Report content could not be extracted reliably.`
- AI analysis does not call Gemini when extracted report content is unavailable.
- AI responses must be valid structured JSON before persistence.

## Integration Notes

The existing database-backed security integration suite remains skipped unless `RUN_INTEGRATION_TESTS=true` is set.

