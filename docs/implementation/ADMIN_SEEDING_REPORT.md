# Admin Seeding Report

## Summary

Admin seeding is handled by `src/database/seeds/admin.js` during database bootstrap.

## Behavior

- Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment.
- Checks for an existing non-deleted admin user before inserting.
- Creates only one admin user when no admin exists.
- Hashes the password with `bcryptjs` before storage.
- Sets `role = 'admin'` and `status = 'active'`.
- Writes an `audit_logs` record for the seed event.
- Logs the seed event through the shared logger.

## Safety Guarantees

- Existing users are not overwritten.
- Duplicate admin users are not created on restart.
- Plain text admin passwords are never stored in the database.
- The seed is conditional and idempotent.

## Environment

Required values are documented in `.env.example`:

```bash
ADMIN_EMAIL=admin@medexplain.local
ADMIN_PASSWORD=ChangeThisAdminPassword123!
```

Production must replace the default admin password before startup.

