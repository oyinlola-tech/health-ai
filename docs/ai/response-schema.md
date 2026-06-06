# Medical AI Response Schema

All medical-intelligence responses must validate against this structure:

```json
{
  "summary": "",
  "labInterpretation": [],
  "possibleConditions": [],
  "recommendedQuestions": [],
  "safetyDisclaimer": "",
  "sources": []
}
```

## Rules

- JSON only.
- No markdown outside JSON.
- `labInterpretation` must use deterministic lab statuses.
- `possibleConditions` must use cautious educational language.
- `sources` must come from retrieved trusted context.

## Implemented Module

`src/modules/medical-intelligence/aiResponseFormatter.js`

The formatter extracts JSON, validates the schema, and applies safety guardrails before returning the response.

