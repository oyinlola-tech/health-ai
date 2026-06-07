# Deployment Readiness Report

## Status

MedExplain AI is packaged for local judging and production-style startup with no manual SQL execution.

## Ready Paths

```bash
npm install
npm run setup
npm run dev
```

or:

```bash
npm run start:full
```

Docker path:

```bash
docker compose up
```

## Startup Guarantees

- Environment is validated before database bootstrap.
- MySQL database is created automatically if missing.
- JavaScript migrations create missing tables only.
- System subscription data is seeded idempotently.
- Admin user is created only when no admin exists.
- HTTP frontend/backend and Socket.IO start from one server process.
- `/health` verifies DB, AI configuration, realtime, and upload storage.

## Production Safety

- `.env` and runtime uploads/logs are ignored by git and Docker builds.
- CORS is origin allow-list based.
- API rate limiting is enabled.
- Helmet security headers are enabled.
- Error responses suppress stack traces in production.
- MySQL queries use parameterized execution through the repository/pool layer.
- AI calls use cache-first behavior and bounded retry.

## Known Operator Requirement

For real production, set `NODE_ENV=production` and provide real Gemini, OPay, JWT, cookie, CSRF, message encryption, database, and admin credentials.
