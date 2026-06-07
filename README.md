# MedExplain AI

## AI-Powered Medical Intelligence Platform

<p align="center">
  <a href="https://lottiefiles.com/animations/medical-healthcare-icon-animation-v7z9Z5W5jS" aria-label="Optional healthcare animation reference">
    <img src="https://img.shields.io/badge/Animated%20Healthcare%20Visual-LottieFiles-FF6E5C?style=for-the-badge" alt="Animated healthcare visual" />
  </a>
</p>

<p align="center">
  <strong>Understand your medical reports. Connect with verified doctors. Powered by trusted medical intelligence.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-HTML%20%2B%20Tailwind%20CSS%20%2B%20JavaScript-2B2724" alt="Frontend stack" />
  <img src="https://img.shields.io/badge/Backend-Node.js-22C55E" alt="Backend stack" />
  <img src="https://img.shields.io/badge/Database-MySQL%20%28AMPPS%29-F59E0B" alt="Database stack" />
  <img src="https://img.shields.io/badge/AI-Gemini%20via%20Backend-FF6E5C" alt="AI stack" />
  <img src="https://img.shields.io/badge/Security-RBAC%20%2B%20Consent%20%2B%20Rate%20Limits-EF4444" alt="Security controls" />
</p>

MedExplain AI is a secure healthcare workspace for medical report explanation, trusted-source AI support, verified doctor consultations, doctor recruitment, OPay subscriptions, and user-controlled consent.

## Features

- 🧠 AI Medical Report Explanation
- 🩺 Doctor Verification System
- 💳 Secure OPay Payments
- 💬 Real-time Chat & Consultation
- 📚 RAG-based Medical Knowledge System
- 🔐 Consent & Privacy Control Center

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, Tailwind CSS, JavaScript |
| Backend | Node.js, Express |
| Database | MySQL, AMPPS-compatible local setup |
| AI | Gemini API through backend services only |
| Realtime | WebSockets / Socket.IO |
| Security | Rate limiting, RBAC, input validation, CSRF, audit logs |
| Storage | Local file system under `/uploads` |

## Architecture

```text
Frontend
  |
  v
Backend API -----> MySQL
  |                 |
  |                 +--> Consent, audit, reports, payments, jobs
  |
  +--> Gemini AI through RAG Layer
  |       |
  |       +--> Trusted medical sources only
  |
  +--> OPay Payment Gateway
  |
  +--> WebSocket Server
```

## Project Flow

Patient:

```text
Register -> Grant consent -> Upload report -> AI analysis -> Doctor consultation -> Payment -> History tracking
```

Doctor:

```text
Apply -> Admin review -> Verification -> Consult patients -> Receive notifications
```

Admin:

```text
Manage system -> Post jobs -> Verify doctors -> Monitor AI usage and payments -> Review audit logs
```

## Security Features

- Rate limiting for authentication, AI, payments, uploads, webhooks, and bookings.
- Consent enforcement for medical data processing, AI analysis, doctor sharing, and payment processing.
- Sensitive data handling through backend-controlled services and server-side validation.
- Role-based access control for patients, doctors, and admins.
- Input validation with Zod and SQL injection prevention through parameterized queries.
- Secure file upload validation with MIME, extension, path, size, magic-byte, and malware-signature checks.
- OPay payment verification is server-side only.
- RAG context is limited to trusted medical sources.

## Legal And Privacy

The platform includes route-connected legal and trust pages:

- `/terms`
- `/privacy`
- `/data-policy`
- `/consent`

Users can grant, revoke, view, and download consent history. Revoking consent immediately blocks affected processing paths.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and configure:

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
OPAY_MERCHANT_ID=your-opay-merchant-id
OPAY_PUBLIC_KEY=your-opay-public-key
OPAY_SECRET_KEY=your-opay-secret-key
OPAY_WEBHOOK_SECRET=your-opay-webhook-secret
```

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
npm test
```

Health check:

```bash
curl http://localhost:3000/health
```

## Documentation

Project reports, audits, architecture notes, implementation summaries, API specs, security documents, and decisions live in [`docs/`](docs/README.md).

## Disclaimer

MedExplain AI is for informational support only. It does not replace medical professionals, diagnose conditions, prescribe treatment, or provide emergency instructions. Users should consult qualified clinicians for medical decisions and seek emergency care through appropriate local emergency services when needed.

