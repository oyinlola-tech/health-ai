# Routing Audit

Generated: 2026-06-06

## Backend Route Style

The Express app serves `public/index.html` for route-style paths including `/`, `/login`, `/register`, `/dashboard`, `/reports`, `/report/:id`, `/chat`, `/doctors`, `/doctor/:id`, `/profile`, `/settings`, `/subscription`, `/help`, `/contact`, `/privacy`, `/terms`, `/admin`, and `/doctor`.

## API Routes

Mounted under `/api`:

- `/auth`
- `/me`
- `/reports`
- `/ai`
- `/appointments`
- `/notifications`
- `/recruitment`
- `/admin`
- `/doctor`
- `/legal`
- `/health-history`
- subscriptions and doctor marketplace routes at `/api/*`

## Fixed

- `scripts/runtime-route-audit.cjs` no longer depends on undeclared Playwright. It now performs HTTP route shell checks with request timeouts.

## Verified

- Static route audit found no broken route-style links.
- Frontend routes are normalized through `public/assets/js/router/routes.js` and dispatched in `public/assets/js/router/router.js`.

## Remaining Risk

- Runtime route audit could not be completed locally because server startup hung in this shell. Re-run with `SKIP_DB_STARTUP=true PORT=3002 ROUTE_AUDIT_BASE_URL=http://127.0.0.1:3002 node scripts/runtime-route-audit.cjs` once the local server is known to be available.
