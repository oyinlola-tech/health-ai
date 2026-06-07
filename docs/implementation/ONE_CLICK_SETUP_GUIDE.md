# One-Click Setup Guide

## Local AMPPS/MySQL

1. Create `.env` from `.env.example`.
2. Set MySQL credentials:

```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=medexplain_ai
```

3. For local runs without live Gemini/OPay keys, keep those integrations blank and expect `/health` to report AI or payment-dependent flows as degraded until credentials are configured:

```bash
NODE_ENV=development
```

The app no longer seeds sample patients, doctors, reports, appointments, chat, consent, or AI usage records. Use the real registration and admin flows to create test data.

4. Start:

```bash
npm install
npm run start:full
```

The command runs setup first, then starts the app with frontend, backend API, and WebSocket support.

## Production

Set:

```bash
NODE_ENV=production
GEMINI_API_KEY=...
OPAY_MERCHANT_ID=...
OPAY_PUBLIC_KEY=...
OPAY_SECRET_KEY=...
OPAY_WEBHOOK_SECRET=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
COOKIE_SECRET=...
CSRF_SECRET=...
MESSAGE_ENCRYPTION_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

Then run:

```bash
npm ci
npm run setup
npm start
```

## Docker

```bash
docker compose up
```

The compose stack starts MySQL, backend, and a static frontend container. The backend remains the canonical API and realtime server.
