# Reports Validation Report

Status: PASS for list, upload, detail, delete. Analysis returns a correct actionable failure when extraction fails.

| Capability | API | Result |
| --- | --- | --- |
| List reports | `GET /api/reports` | PASS |
| Upload report | `POST /api/reports` | PASS, file persisted under `uploads/reports` |
| View report details | `GET /api/reports/:id` | PASS |
| Delete report | `DELETE /api/reports/:id` | PASS |
| Analyze report | `POST /api/reports/:id/analyze` | Guarded correctly; returns `400 Report content could not be extracted reliably` for failed extraction |

Fixes applied:

- Report page empty state now says “Upload your first report to begin.”
- Generic report loading/upload/detail failures now show session/server/consent-specific messages.
- API error middleware fix ensures report failures return JSON.

Remaining local limitation:

- The generated minimal test PDF did not extract successfully through `pdf-parse`, so analysis was validated through the backend guard path. A successfully extracted report plus configured `GEMINI_API_KEY` is required for full AI analysis generation.
