# Security Fixes Summary

## Authentication

- Added JWT issuer and audience environment configuration.
- Added token type claims for access and refresh tokens.
- Enforced HS256 algorithm, issuer, audience, and token type in HTTP and socket auth.
- Refresh now rejects disabled or deleted users before issuing a new session.
- Added throttling for refresh, logout, and email verification.

## Authorization

- Fixed doctor report listing so doctors only see assigned patients' reports.
- Preserved patient-own-data checks and admin full-access behavior.
- WebSocket room joins remain repository-authorized.

## Upload Security

- Added filename sanitization.
- Added extension allowlist by MIME type.
- Added magic-byte validation for PDF, PNG, JPEG, and WEBP.
- Added upload root containment checks.
- Added rejected-file deletion.
- Added local EICAR malware detection hook.
- Added upload spam rate limits.

## AI Security

- Added prompt-injection patterns for admin/system impersonation.
- Wrapped report and chat input as untrusted content blocks.
- Prevented raw medical prompts from being stored in `ai_interactions`.
- Existing AI gateway remains the only Gemini call path.

## Payment Security

- Added timing-safe webhook signature comparison.
- Added amount and currency integrity checks before subscription activation.
- Preserved replay-key webhook protection.

## API / Headers / Abuse

- Tightened CSP script source to same-origin only.
- Denied framing through CSP and frameguard.
- Added no-referrer policy.
- Restricted CORS methods and headers.
- Added AI endpoint and upload endpoint rate limits.
- Production server errors now redact internal messages and details.

## WebSocket Security

- Added strict zod validation for socket payloads.
- Added max message length.
- Preserved per-socket message rate limiting.
- Invalid low-level realtime events are logged and rejected safely.

## Dependencies

- Upgraded Nodemailer.
- Upgraded Vitest/Vite/esbuild chain.
- Verified `npm audit` and `npm audit --omit=dev` both report zero vulnerabilities.

