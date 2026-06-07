# Database Health Report

Generated: 2026-06-07

## Result

PASS with one documented schema note.

## Verification

- MySQL connection: PASS
- `npm run migrate`: PASS
- Database bootstrap: PASS
- Seed verification: PASS
- Required table spot checks: PASS for users, reports, subscriptions, payments, appointments, notifications, doctor_profiles, health_history, chat_messages, audit_logs, event_logs
- Index verification: PASS by migration definitions and bootstrap execution
- UUID primary identifiers: PASS by migration `id` helper and `createId()` usage

## Schema Note

- `roles` is not a standalone table. Roles are stored as `users.role` and normalized through `src/models/roles.js` and repository mapping.

## Fixes Applied

- Fixed admin coupon list query for MySQL `ONLY_FULL_GROUP_BY`.
- Hardened coupon create/disable/redeem mutations to avoid relying on `returning *` for MySQL mutation reads.

## Residual Risk

- Foreign keys are mostly enforced at application/repository level rather than explicit migration-level FK constraints. This is operationally acceptable for local recovery, but production hardening should add explicit FK constraints in an approved migration window.
