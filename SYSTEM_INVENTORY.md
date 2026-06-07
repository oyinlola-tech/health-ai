# System Inventory

Generated: 2026-06-07

## Frontend

- Active SPA entry: `public/index.html`
- Shared shell/components: `public/assets/js/components/shell.js`, `public/assets/js/components/forms.js`
- Router: `public/assets/js/router/router.js`
- Route metadata/aliases: `public/assets/js/router/routes.js`
- API client: `public/assets/js/api/client.js`
- Page modules: `home.js`, `reports.js`, `doctors.js`, `subscription.js`, `legal.js`, `recovery.js`, `workspaces.js`
- Canonical primary routes: `/`, `/login`, `/register`, `/dashboard`, `/reports`, `/report/:id`, `/chat`, `/doctors`, `/appointments`, `/settings`, `/subscription`, `/notifications`, `/doctor`, `/admin`
- Admin subroutes: `/admin/users`, `/admin/doctors`, `/admin/doctor-applications`, `/admin/reports`, `/admin/ai-usage`, `/admin/payments`, `/admin/subscriptions`, `/admin/coupons`, `/admin/audit-logs`, `/admin/analytics`, `/admin/system-settings`
- Legacy HTML pages are retained under `public/**` and redirected to route-style paths by `src/app.js`.

## Backend

- App/server: `src/app.js`, `src/server.js`
- API root: `src/routes/index.js`
- Route modules: auth, me/settings, reports, AI, appointments, notifications, recruitment, admin, doctor, legal, health-history, medical-knowledge, subscriptions, doctor marketplace, system diagnostics
- Controllers: `src/controllers/*Controller.js`
- Services: `src/services/*.js`, `src/modules/*/*.service.js`
- Repositories: `src/repositories/*.js`, `src/modules/promotions/coupon.repository.js`
- Middleware: auth, CSRF, rate limiting, validation, upload validation, request IDs, sanitize, audit, error handling

## Database

- MySQL connection layer: `src/database/connection.js`
- Bootstrap: `src/database/bootstrap.js`
- Migrations: `src/database/migrations/index.js`
- Seeded system data: admin user, legal/privacy/system knowledge, pricing plans
- Key tables: users, refresh_tokens, doctor_profiles, reports, report_analyses, subscriptions, payments, appointments, notifications, notification_center, health_history, chat_messages, audit_logs, event_logs, user_events, user_sessions, coupons

## Runtime Scripts

- `npm run migrate`: database bootstrap/migrations
- `npm run audit:integrity`: static frontend/route integrity audit
- `npm run smoke:frontend`: frontend HTML/JS smoke validation
- `npm run lint`: ESLint
- `npm test`: Vitest suite
