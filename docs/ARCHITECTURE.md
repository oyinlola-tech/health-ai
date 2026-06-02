# Architecture Report

MedExplain AI uses a layered Node.js architecture.

## Layers

- `src/server.js` starts the process, validates environment, verifies database connectivity, runs non-destructive migrations, and listens for requests.
- `src/app.js` creates the Express app, security middleware, static frontend serving, and API routing.
- `src/routes/` maps HTTP endpoints to controllers.
- `src/controllers/` translates HTTP input into service calls and API responses.
- `src/services/` contains business rules for auth, reports, AI, appointments, doctor recruitment, admin, legal, and notifications.
- `src/repositories/` owns SQL queries and persistence.
- `src/migrations/` contains idempotent PostgreSQL DDL.
- `public/assets/js/` contains shared frontend HTTP, auth/session, UI state, validation, and navigation helpers.

## Data Flow

Frontend pages call module `api.js` files. Module APIs use the shared HTTP client, which attaches access tokens, CSRF tokens, and handles refresh. Backend routes validate input with Zod, enforce RBAC/ownership, call services, persist through repositories, and return `{ success, data, error, meta }`.

## Security Model

JWT access tokens protect API requests. Refresh tokens are stored in httpOnly cookies and rotated. CSRF tokens protect unsafe methods. RBAC restricts admin and doctor workflows. Ownership checks prevent users from reading or mutating data they do not own. Uploads are validated before local storage.
