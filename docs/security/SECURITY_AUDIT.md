# Security Audit

## Summary

The authentication layer now follows a hybrid SaaS security model:

- Access tokens are JWTs sent in `Authorization: Bearer ...` headers.
- Refresh tokens are stored only in an httpOnly cookie.
- The refresh cookie is scoped to `/api/auth/refresh`.
- Global CSRF middleware is intentionally not used because protected API actions do not authenticate with ambient browser cookies.

## Findings Addressed

### 1. CodeQL `js/missing-token-validation`

Status: Addressed

CodeQL flagged `cookie-parser` because cookie middleware was present before request handlers. The app does not use cookies for protected API authorization. A security design note and CodeQL suppression comment were added in `src/app.js` to document the architecture.

### 2. Global CSRF Middleware

Status: Removed

Global CSRF validation and the `/api/auth/csrf` token endpoint were removed. Mutating API routes now rely on JWT bearer authentication, not CSRF tokens.

### 3. Refresh Token Cookie

Status: Hardened

Refresh cookies are now:

- `httpOnly: true`
- `secure: true` in production
- `sameSite: "strict"`
- `path: "/api/auth/refresh"`

### 4. JWT Authorization

Status: Verified

Protected API routes use `authenticate`, which only accepts `Authorization: Bearer <access-token>`. Cookie-based role checks were not found.

### 5. Refresh Route Origin Guard

Status: Added

`POST /api/auth/refresh` now rejects untrusted browser origins before reading the refresh cookie.

## Verification

Commands run:

- `npm run lint`
- `npx vitest run tests/appSecurityMiddleware.test.js`
- `npm test`

Result: Passing.
