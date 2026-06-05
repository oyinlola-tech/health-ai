# Database Bootstrap Report

## Startup Flow

The backend startup path is:

1. Load and validate environment with `src/config/env.js`.
2. Connect to the MySQL server without selecting an application database.
3. Create `DB_NAME` if it does not exist.
4. Acquire a pooled database connection.
5. Ensure `schema_migrations` exists.
6. Run unapplied JavaScript migrations.
7. Seed system data conditionally.
8. Seed the first admin user conditionally.
9. Verify the database connection.
10. Start the HTTP and WebSocket server.

## Files

- `src/database/bootstrap.js`: database creation, retry logic, migration runner, seed orchestration.
- `src/database/connection.js`: MySQL pool and repository-compatible query adapter.
- `src/database/migrate.js`: CLI setup entrypoint.
- `src/database/migrations/`: idempotent table creation scripts.
- `src/database/seeds/`: conditional seed scripts.

## AMPPS Compatibility

The default `.env.example` values target local AMPPS-style MySQL:

- `DB_HOST=127.0.0.1`
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_NAME=medexplain_ai`

## Commands

```bash
npm install
npm run setup
npm run dev
```

`npm run dev` also runs database bootstrap before listening, so restarts remain stable after the first setup.

