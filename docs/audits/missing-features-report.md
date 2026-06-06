# Missing Features Report

Generated: 2026-06-06

## Missing For MVP Production Confidence

- Live OPay staging verification for checkout, webhook, verification, refund, and entitlement activation.
- Live Gemini verification for report analysis, chat, RAG source attribution, fallback behavior, and cost logging.
- Full browser/mobile/accessibility test pass.
- CI-ready tracked tests or an alternative tracked test harness.

## Partially Implemented Areas

- Doctor dashboard: appointments/reports exist; queue, analytics, settings, verification status, and richer consultation workflows need deeper contracts.
- Admin dashboard: users, doctor creation, analytics, monetization, AI costs, report metrics, and audit logs exist; payments/subscriptions/security logs/system settings/jobs need fuller API coverage.
- OCR: extraction exists; manual review and retry workflow need product decisions.

## Not Recommended

Do not add fake data to fill these gaps. Use explicit empty states or implement the real backend contract.
