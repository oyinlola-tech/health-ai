# Auth Flow Diagram

## Login

```text
Client
  |
  | POST /api/auth/login
  | email + password
  v
Auth Controller
  |
  v
Auth Service validates credentials
  |
  +--> returns access JWT in JSON response
  |
  +--> sets refresh token cookie:
       httpOnly
       SameSite=strict
       Secure in production
       Path=/api/auth/refresh
```

## Protected API Request

```text
Client
  |
  | Authorization: Bearer <access-token>
  v
Express Route
  |
  v
authenticate middleware
  |
  +--> verifies JWT signature, issuer, audience, and typ=access
  |
  +--> loads user
  |
  v
Controller / Service
```

Cookies are not used for protected API authorization.

## Refresh

```text
Client
  |
  | POST /api/auth/refresh
  | refresh cookie is sent only to this path
  v
refreshTokenCookieGuard
  |
  +--> rejects untrusted browser Origin
  +--> requires mx_refresh cookie
  |
  v
Auth Service rotates refresh token
  |
  +--> revokes previous refresh token
  +--> returns new access JWT
  +--> sets new refresh cookie
```

## Logout

```text
Client
  |
  | POST /api/auth/logout
  | Authorization: Bearer <access-token>
  v
authenticate middleware
  |
  v
Auth Service revokes refresh tokens for the authenticated user
  |
  v
Controller clears refresh cookie at /api/auth/refresh
```

Logout does not depend on cookie authentication.
