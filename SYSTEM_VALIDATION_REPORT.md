# System Validation Report

Generated: 2026-06-07

## Automated Validation

- Homepage/static route smoke: PASS
- Register: PASS
- Login: PASS
- Dashboard API dependency: PASS
- Reports API: PASS
- Settings API: PASS
- AI chat history API: PASS
- AI chat send: PARTIAL, Gemini diagnostic passed; one ad-hoc patient send probe exceeded timeout
- Doctor dashboard route wiring: PASS
- Admin dashboard/API: PASS
- Subscriptions API: PASS
- Gemini diagnostic: PASS
- Frontend smoke: PASS
- Lint: PASS
- Unit/integration tests: PASS, 12 files passed, 1 skipped; 43 tests passed, 10 skipped

## Operational Note

- A manually started PowerShell job server did not persist across shell sessions. Use `npm run dev` from a stable terminal for ongoing local development. In-process Express validation and static frontend validation passed.
- The direct patient chat send path needs a stable-terminal acceptance pass because an ad-hoc shell probe timed out even though the backend Gemini diagnostic completed successfully.
