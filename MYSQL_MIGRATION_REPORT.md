# MySQL Migration Report

## Summary

MedExplain AI now uses MySQL through `mysql2/promise` and a shared connection pool. Runtime database setup no longer depends on raw `.sql` files.

## Implemented

- Added MySQL bootstrap at `src/database/bootstrap.js`.
- Added pooled MySQL connection adapter at `src/database/connection.js`.
- Converted schema setup into JavaScript migration modules under `src/database/migrations/`.
- Removed legacy raw SQL migration files from `src/migrations/`.
- Preserved existing repository APIs through the current pool/repository layer.
- Added `npm run setup` as an alias for the JavaScript bootstrap/migration command.

## Migration Modules

- `users.js`
- `doctors.js`
- `reports.js`
- `appointments.js`
- `ai_usage.js`
- `payments.js`
- `subscriptions.js`
- `notifications.js`
- `chat.js`
- `audit_logs.js`

The migration modules also include related tables required by existing APIs, including recruitment, RAG documents/chunks, legal consent records, realtime presence, payment webhooks, refunds, and billing events.

## Safety Rules

- Tables are created with `create table if not exists`.
- Tables are never dropped automatically.
- Existing tables are not altered on restart.
- Applied migrations are tracked in `schema_migrations`.
- Database names are validated before being interpolated into `create database`.
- Query execution uses parameterized placeholders.

## Verification

- `npm test` passes.
- `npm run lint` passes.
- No `.sql` files remain in the repository.
- No runtime raw `.sql` file execution remains.

