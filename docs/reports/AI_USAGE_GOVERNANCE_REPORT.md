# AI Usage Governance Report

## Enforced Features

Governed feature types:

- `report_analysis`
- `chat_message`
- `follow_up_question`
- `doctor_assist_request`

## Safety Controls

Requests are blocked before Gemini when they contain:

- prompt injection attempts
- system prompt extraction attempts
- secret or API key extraction attempts
- jailbreak language
- excessive context

Blocked requests are logged with safety flags and do not call Gemini.

## Rate Limits

Implemented:

- per-user daily caps
- per-user burst-per-minute caps
- user monthly budget caps
- system monthly budget caps
- feature monthly budget caps

## Frontend Visibility

Added:

- patient AI usage meter
- monthly quota bar
- request count
- token usage
- admin AI cost dashboard panel

Limits are never hardcoded in the frontend. The frontend displays backend-measured usage only.

## Tests

Added `tests/aiGovernance.test.js`.

Verified:

- Pro model routing for medical reports
- persistent cache hit path avoids Gemini
- budget blocking happens before Gemini
- prompt injection blocking happens before Gemini
- blocked and cached requests are logged

