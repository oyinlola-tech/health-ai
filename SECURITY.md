# Security Policy

## Supported Scope

MedExplain AI is an active local-first healthcare application. Security fixes are prioritized for the current `main` branch and any production deployment derived from it.

## Reporting A Vulnerability

If you find a vulnerability, do not open a public issue with exploit details. Send a private report to the project owner with:

- A short description of the issue.
- The affected route, API endpoint, file, or workflow.
- Reproduction steps.
- Impact and any evidence, such as logs or screenshots.
- Whether protected health information, credentials, payment data, or tokens may be exposed.

Expected response:

- Initial acknowledgement: within 3 business days.
- Triage update: within 7 business days.
- Critical issues are handled before feature work.

## Security Controls

The application is designed around these controls:

- Backend-only AI calls through the Gemini gateway.
- Role-based access control for patient, doctor, and admin routes.
- JWT bearer access tokens for protected API routes.
- httpOnly refresh cookies scoped only to `/api/auth/refresh`.
- SameSite=strict refresh cookies and origin checks on the refresh endpoint.
- Rate limiting for app, auth, AI, upload, booking, payment, coupon, and webhook paths.
- Bcrypt password hashing.
- Parameterized MySQL queries.
- Strict upload validation and storage under `/uploads`.
- Audit logging for security-sensitive workflows.
- Consent and privacy preference enforcement before AI processing.
- Helmet-powered security headers and a restrictive content security policy.

## Secrets And Credentials

Never commit `.env`, API keys, payment credentials, JWT secrets, cookie secrets, encryption secrets, or SMTP credentials.

Production deployments must replace all development defaults, especially:

- `ADMIN_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`
- `PAYMENT_DATA_ENCRYPTION_SECRET`
- `MESSAGE_ENCRYPTION_SECRET`
- `GEMINI_API_KEY`
- OPay credentials and webhook secrets

## Dependency And Supply Chain

Run security-sensitive dependency updates through normal verification:

```bash
npm run lint
npm test
npm run smoke:frontend
node scripts/runtime-route-audit.cjs
```

Third-party browser scripts must be added deliberately, pinned to a version where possible, and allowed in `src/app.js` CSP only for the exact origins required.

## AI Safety

AI responses are educational support only. The system must not diagnose, prescribe, or replace a clinician. All AI calls must go through backend services so consent, entitlement, rate limits, budget controls, prompt safety, and audit logging remain enforceable.

## Medical Disclaimer

MedExplain AI is not an emergency service. Users should contact local emergency services or a qualified clinician for urgent symptoms, diagnosis, treatment, or medical decisions.
