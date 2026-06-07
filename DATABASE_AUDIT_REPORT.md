# Database Audit Report

Status: PASS with adapter fixes applied.

| Area | Result |
| --- | --- |
| MySQL connection | PASS (`select 1`) |
| Migrations | PASS, 20 JavaScript migrations applied |
| UUID generation | PASS, IDs use UUIDv7 via `createId()`; sample `019ea195-bdad-769b-8513-0230be15d7d7` |
| Tables | PASS for users, refresh tokens, reports, subscriptions, plans, entitlements, payments, webhooks, billing events, audit logs, notifications, consent, doctors, appointments, analytics/email event tables |
| Indexes | PASS, audited tables have indexes/unique keys where expected |
| Foreign keys | Present where migrations define them; several business relationships are indexed but not FK-constrained by existing schema |

Fixes applied:

- Fixed repeated PostgreSQL-style placeholders in the MySQL adapter.
- Fixed prepared `LIMIT/OFFSET` parameter handling in the MySQL adapter.
- Verified consent, admin user listing, and audit-log queries after adapter fixes.

No schema migration was added; fixes were query-adapter/runtime compatibility changes.
