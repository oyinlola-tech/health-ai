# System Fix Report

Generated: 2026-06-06

## What Was Broken

- Legacy `.html` routes were still publicly reachable as first-class pages, which conflicted with route-style navigation.
- `public/sitemap.html` listed direct file paths instead of canonical application routes.
- `scripts/integrity-audit.mjs` still normalized links back to old `.html` pages, so future audits could undo route-style cleanup.
- Production startup validation did not include `PAYMENT_DATA_ENCRYPTION_SECRET`.
- The server had no canonical redirect layer for old generated page paths.

## What Was Fixed

- Added Express 301 redirects from legacy `.html` paths to canonical routes such as `/dashboard`, `/reports`, `/chat`, `/subscription`, and `/admin`.
- Added `/sitemap` as the route-style route directory endpoint.
- Replaced `public/sitemap.html` with a canonical route directory.
- Replaced the mutating integrity audit with a route-style audit that fails on placeholder links, direct `.html` navigation, broken internal links, and empty JS files.
- Updated the dashboard page directory link from `/sitemap.html` to `/sitemap`.
- Added `PAYMENT_DATA_ENCRYPTION_SECRET` to production startup validation.

## Verified

- `npm run migrate`
- `npm run lint`
- `npm test`
- `npm run audit:integrity`
- `npm run smoke:frontend`
- `node scripts/runtime-route-audit.cjs`
- Live route checks:
  - `/app/dashboard.html` returns `301 /dashboard`
  - `/sitemap` returns the route directory

## What Remains

- Live Gemini and OPay behavior requires production credentials.
- Legacy HTML shell files remain in `public/` as redirect-compatible artifacts, but canonical navigation no longer links to them.
- Doctor-created account login in local development still depends on SMTP or the admin-only temporary credential response.
