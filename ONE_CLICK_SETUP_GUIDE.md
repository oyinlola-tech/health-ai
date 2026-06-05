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

3. For judging without live Gemini/OPay keys:

```bash
DEMO_MODE=true
NODE_ENV=development
```

Demo mode creates isolated sample patient, doctor, report, appointment, chat, consent, and AI usage records. It is blocked in production startup validation.

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
DEMO_MODE=false
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
