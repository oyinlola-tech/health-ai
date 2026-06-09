# CSRF Decision Report

## Decision

Do not use global CSRF middleware.

## Reason

CSRF is required when browser-sent cookies automatically authenticate state-changing requests. MedExplain AI does not use cookies for protected API authorization.

The primary access mechanism is:

```text
Authorization: Bearer <access-token>
```

An attacker cannot force a browser to attach this custom Authorization header with a cross-site form submission.

## Refresh Token Exception

The refresh token is cookie based, so it is treated separately.

Mitigations:

- Refresh cookie is `httpOnly`
- Refresh cookie is `SameSite=strict`
- Refresh cookie is `secure` in production
- Refresh cookie path is `/api/auth/refresh`
- Refresh route rejects untrusted browser origins
- Refresh route only rotates tokens; it is not used for application state-changing actions

## CodeQL

CodeQL rule `js/missing-token-validation` can flag Express apps that use `cookie-parser` without global CSRF middleware. In this application that would be a false positive because protected API routes do not authenticate from cookies.

The app now documents this in `src/app.js` and suppresses the false positive at the `cookieParser` registration:

```js
// codeql[js/missing-token-validation]
```

## Result

The architecture preserves JWT bearer auth, hardens the only cookie-authenticated endpoint, and avoids applying broad CSRF middleware where it does not belong.
