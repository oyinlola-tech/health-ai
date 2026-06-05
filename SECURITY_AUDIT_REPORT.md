# Security Audit Report

## Executive Summary

Performed a production-grade security hardening pass across authentication, authorization, uploads, AI, payments, WebSockets, headers, rate limiting, error handling, and dependency hygiene.

High-risk issues fixed:

- Doctor report listing no longer exposes all reports to every doctor.
- Uploads now validate extension, MIME allowlist, magic bytes, path containment, and EICAR malware signature.
- JWT access and refresh tokens now require token type, issuer, audience, and HS256 algorithm.
- AI interactions no longer persist raw medical prompts in `ai_interactions`.
- OPay verification now checks provider amount and currency against server-side payment records.
- WebSocket events now validate payload shape and UUIDs before room/message operations.
- Production errors no longer expose internal details.
- Runtime and dev dependency audits now return zero vulnerabilities.

## Critical / High Findings Fixed

### SEC-001: Doctor Report Data Leak

Location: `src/repositories/reportRepository.js`

Issue: doctors could list all reports because `listForUser` treated Admin and Doctor the same.

Fix: doctors now use `listForDoctorPatients`, restricted to patients with appointments assigned to that doctor.

### SEC-002: Upload MIME Spoofing

Location: `src/middlewares/upload.js`

Issue: file uploads trusted client-provided MIME type.

Fix: added extension allowlist, magic-byte validation, upload-root containment checks, filename sanitization, rejected-file deletion, and EICAR malware detection hook.

### SEC-003: Weak JWT Claim Enforcement

Location: `src/services/tokenService.js`, `src/middlewares/auth.js`, `src/realtime/authSocketMiddleware.js`

Issue: JWT verification did not pin issuer, audience, algorithm, or token type.

Fix: access, refresh, and email verification tokens now include and verify explicit issuer/audience/type claims.

### SEC-004: AI Prompt Data Exposure

Location: `src/services/aiService.js`

Issue: raw medical report content and user prompts were stored in `ai_interactions.prompt`.

Fix: stored prompt audit records now contain request metadata only. Raw prompts remain transient through the backend AI gateway.

### SEC-005: Payment Integrity Gap

Location: `src/services/subscriptionService.js`

Issue: successful provider status was verified, but amount/currency integrity was not enforced before activation.

Fix: OPay verification and webhooks now compare provider amount/currency to stored server-side payment records before activating subscriptions.

## Medium Findings Fixed

- Added stricter CSP script policy, denied framing, no-referrer policy, and tighter CORS methods/headers.
- Added AI endpoint rate limits, upload rate limits, and sensitive auth route throttles.
- Added strict WebSocket message, room, read, and notification payload validation.
- Added prompt injection patterns for admin/system impersonation attempts.
- Added refresh-session invalidation for disabled/deleted users.
- Added production-safe server error redaction.
- Upgraded vulnerable dependencies.

## Verification

Commands passed:

```bash
npm.cmd run lint
npm.cmd test
npm.cmd audit
npm.cmd audit --omit=dev
git diff --check
```

Result:

- 9 test files passed, 1 skipped
- 33 tests passed, 10 skipped
- npm audit: 0 vulnerabilities

## Residual Assumptions

- TLS termination/HSTS behavior must be verified in deployment infrastructure.
- Logs should be shipped to append-only storage in production.
- Upload malware scanning currently includes a local EICAR detection hook; production should connect this interface to a full AV scanner.
- Frontend still stores short-lived access tokens in `sessionStorage`; this is mitigated by CSP and short TTLs but should be revisited for a cookie-only access model.

