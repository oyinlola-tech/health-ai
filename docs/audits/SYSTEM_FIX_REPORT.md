# System Fix Report

Generated: 2026-06-07

## What Was Broken

- The frontend API client contained an embedded UTF-8 BOM before the shared `appConfig` declaration. Browsers usually tolerate it, but it was unnecessary startup fragility in the core API layer.
- Entitlement unit tests were no longer fully isolated after trial and coupon access checks were added. The tests could reach a real MySQL connection on `127.0.0.1:3306`.
- Earlier stabilization work had already identified and fixed the larger integration issues: direct `.html` navigation, legacy sitemap paths, demo data seeding, webhook-only payment activation, and missing payment encryption startup validation.

## What Was Fixed

- Removed the embedded BOM from `public/assets/js/api/client.js`.
- Updated `tests/entitlementService.test.js` to mock trial and coupon access dependencies so entitlement tests remain unit-level and do not require MySQL.
- Verified the canonical Express route shell still serves route-style frontend paths and redirects legacy generated `.html` paths.
- Verified the active runtime path remains MySQL-backed: routes call controllers, controllers call services, and services call repositories/database modules.

## Current Integration State

- Frontend actions use `/api` through the shared API client, with JWT access tokens, CSRF headers, refresh-token retry, and structured error handling.
- Authentication issues JWT access tokens and httpOnly refresh cookies; patient registration starts a 14-day trial.
- Report upload and AI analysis are backend-owned and protected by authentication, upload validation, rate limiting, and entitlement checks.
- AI chat and report analysis go through centralized AI/RAG services and usage tracking.
- OPay checkout is initialized server-side. Paid access activates from signed webhook processing; the browser payment-success page only reads backend status.
- Coupon and trial flows are enforced backend-side. Full-discount checkout skips OPay and activates access with a verified internal payment record.
- Doctor and admin workspaces load real backend endpoints and render empty states when no records exist.

## Verification

- `npm run smoke:frontend` passed.
- `npm run audit:integrity` passed.
- `npm run lint` passed.
- `npm test` passed: 11 test files passed, 1 skipped; 41 tests passed, 10 skipped.

## What Remains

- Live Gemini and OPay verification still require real production credentials and provider callbacks.
- Legacy generated HTML files remain in `public/` for redirect compatibility, but canonical navigation uses route paths.
- Some workspace tabs are consolidated shells backed by available APIs; they should stay empty-state driven until dedicated operational requirements are added.
- The payment schema still uses historical `amount_cents` column names while storing NGN numeric values. This is documented technical debt, not an active USD conversion path.
