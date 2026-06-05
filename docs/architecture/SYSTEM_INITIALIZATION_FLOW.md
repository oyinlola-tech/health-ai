# System Initialization Flow

## Production Boot Sequence

```text
env load
  -> env validation
  -> MySQL server connection with retry
  -> create database if missing
  -> pooled database connection
  -> schema_migrations check
  -> JavaScript migrations
  -> conditional system seeds
  -> conditional admin seed
  -> database health verification
  -> Express app creation
  -> WebSocket registration
  -> server listen
```

## Restart Behavior

- Existing database remains intact.
- Existing tables are not dropped or altered.
- Applied migrations are skipped through `schema_migrations`.
- System seed data uses upsert behavior where required.
- Admin seed exits when an admin already exists.

## Failure Behavior

- MySQL server connection retries are controlled by:
  - `DB_CONNECTION_RETRIES`
  - `DB_CONNECTION_RETRY_MS`
- Startup fails fast with a logged error if bootstrap cannot complete.
- The HTTP server starts only after database initialization succeeds.

## Fresh Machine Path

```bash
npm install
npm run setup
npm run dev
```

No manual SQL execution is required.

