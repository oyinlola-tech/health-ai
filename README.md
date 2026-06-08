# MedExplain AI

## AI-Powered Medical Intelligence Platform

<p align="center">
  <strong>Understand medical reports, continue AI-supported health conversations, and connect with verified doctors.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-HTML%20%2B%20CSS%20%2B%20JavaScript-2B2724" alt="Frontend stack" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-22C55E" alt="Backend stack" />
  <img src="https://img.shields.io/badge/Database-MySQL%20%28AMPPS%29-F59E0B" alt="Database stack" />
  <img src="https://img.shields.io/badge/AI-Gemini%20via%20Backend-FF6E5C" alt="AI stack" />
  <img src="https://img.shields.io/badge/Security-RBAC%20%2B%20CSRF%20%2B%20Audit-EF4444" alt="Security controls" />
</p>

MedExplain AI is a secure healthcare workspace for medical report explanation, trusted-source AI support, verified doctor consultations, doctor recruitment, OPay subscriptions, notifications, and user-controlled privacy settings.

## Features

- AI medical report explanation.
- AI chat with persisted conversation history, thread-aware follow-ups, symptom guidance, and appropriate general answers.
- Report upload, report history, report detail, and analysis workflow.
- Verified doctor marketplace, appointments, and doctor workspace.
- Admin workspace for users, doctors, reports, subscriptions, payments, coupons, analytics, and audit logs.
- OPay subscriptions with a safe development simulator.
- RAG-based medical knowledge from MedlinePlus and PubMed imports.
- Consent, privacy, settings, notification, and billing-address controls.
- Accessible UI motion for page entry, cards, dropdowns, toasts, loading states, chat messages, and pinned LottieFiles hero animation.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database | MySQL, AMPPS-compatible local setup |
| AI | Gemini API through backend services only |
| Realtime | WebSockets / Socket.IO |
| Security | Rate limiting, RBAC, CSRF, input validation, upload validation, audit logs |
| Storage | Local file system under `/uploads` |
| Motion | CSS transitions plus LottieFiles `dotLottie-wc` on public hero screens |

## Architecture

```text
Frontend SPA
  |
  v
Backend API -----> MySQL
  |                 |
  |                 +--> users, reports, chat, subscriptions, payments, audit logs
  |
  +--> Gemini AI through backend services and trusted-source context
  |
  +--> OPay payment gateway or development simulator
  |
  +--> WebSocket server
```

## Project Flow

Patient:

```text
Register -> Upload report -> AI analysis -> Chat support -> Subscription/history tracking
```

Doctor:

```text
Apply or admin-created account -> Verification -> Dashboard -> Appointments -> Notifications
```

Admin:

```text
Login -> Dashboard -> Manage users/doctors/reports -> Monitor payments/subscriptions/AI usage -> Review audit logs
```

## Security Features

- Rate limiting for authentication, AI, payments, uploads, webhooks, and bookings.
- CSRF protection for unsafe API requests.
- Role-based access control for patients, doctors, and admins.
- Consent and privacy controls for data processing preferences.
- Sensitive data handling through backend-controlled services and server-side validation.
- SQL injection prevention through parameterized queries.
- Secure file upload validation with MIME, extension, path, size, magic-byte, and malware-signature checks.
- OPay payment verification is server-side only.
- RAG context is limited to trusted medical sources.

Security reporting and operational policy are documented in [`SECURITY.md`](SECURITY.md).

## Motion And LottieFiles

The public landing and splash hero visuals use the LottieFiles `dotLottie-wc` web component pinned to `0.9.16`, with an animation loaded from `lottie.host`. The script is loaded only when the page contains a Lottie hero and the user has not requested reduced motion.

The content security policy in `src/app.js` explicitly allows:

- `https://unpkg.com` for the pinned LottieFiles web component.
- `https://lottie.host` for the `.lottie` animation asset.

If those origins are unavailable, the existing static icon visual remains visible.

## Local Development Mode

Local development can run without live OPay or SMTP credentials.

```env
NODE_ENV=development
OPAY_MOCK_MODE=true
```

In this mode:

- OPay API calls are not made.
- Payment references and successful verification are simulated through backend business logic.
- Payment records, subscriptions, entitlements, analytics, email events, and audit logs still run.
- SMTP delivery is skipped safely when SMTP credentials are absent.
- Authentication, authorization, CSRF, rate limiting, database validation, and entitlement checks are not bypassed.

Production ignores OPay mock mode and must have real payment credentials configured.

## Legal And Privacy

The platform includes route-connected legal and trust pages:

- `/terms`
- `/privacy`
- `/data-policy`
- `/consent`

Users can manage privacy and notification preferences from `/settings`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and configure local values:

```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=medexplain_ai
ADMIN_EMAIL=admin@medexplain.local
ADMIN_PASSWORD=change-this-password
JWT_ACCESS_SECRET=replace-with-a-strong-secret
JWT_REFRESH_SECRET=replace-with-a-strong-secret
GEMINI_API_KEY=your-gemini-key
GEMINI_FLASH_MODEL=gemini-2.5-flash
OPAY_MOCK_MODE=true
```

Production also requires live OPay credentials, webhook secrets, cookie/CSRF secrets, encryption secrets, and SMTP settings.

3. Bootstrap database and seed required system data:

```bash
npm run setup
```

4. Start development server:

```bash
npm run dev
```

Unified startup:

```bash
npm run start:full
```

Docker:

```bash
docker compose up
```

## Verification

```bash
npm run lint
npm run smoke:frontend
npm run audit:integrity
npm test
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Admin-only Gemini diagnostic:

```text
POST /api/system/test-gemini
```

## Documentation

Project reports, audits, architecture notes, implementation summaries, API specs, security documents, and decisions live in [`docs/`](docs/README.md).

Security policy:

- [`SECURITY.md`](SECURITY.md)

Recent recovery and validation reports are available in `docs/`:

- [`SYSTEM_INVENTORY.md`](docs/reports/SYSTEM_INVENTORY.md)
- [`DATABASE_HEALTH_REPORT.md`](docs/reports/DATABASE_HEALTH_REPORT.md)
- [`AUTH_RECOVERY_REPORT.md`](docs/security/AUTH_RECOVERY_REPORT.md)
- [`ROLE_VALIDATION_REPORT.md`](docs/reports/ROLE_VALIDATION_REPORT.md)
- [`FRONTEND_REPAIR_REPORT.md`](docs/reports/FRONTEND_REPAIR_REPORT.md)
- [`API_VALIDATION_REPORT.md`](docs/reports/API_VALIDATION_REPORT.md)
- [`GEMINI_VALIDATION_REPORT.md`](docs/reports/GEMINI_VALIDATION_REPORT.md)
- [`SYSTEM_VALIDATION_REPORT.md`](docs/reports/SYSTEM_VALIDATION_REPORT.md)
- [`FINAL_RELEASE_READINESS_REPORT.md`](docs/reports/FINAL_RELEASE_READINESS_REPORT.md)

## Disclaimer

MedExplain AI is for informational support only. It does not replace medical professionals, diagnose conditions, prescribe treatment, or provide emergency instructions. Users should consult qualified clinicians for medical decisions and seek emergency care through appropriate local emergency services when needed.
