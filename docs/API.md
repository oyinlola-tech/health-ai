# API Documentation

Every API response follows:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Errors follow the same shape with `success: false`.

## Core Endpoints

- `GET /api/health`
- `GET /api/config/public`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/email/verify`
- `GET /api/me`
- `PUT /api/me`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports/:id/analyze`
- `DELETE /api/reports/:id`
- `POST /api/ai/chat`
- `GET /api/ai/chat-history`
- `POST /api/ai/feedback`
- `GET /api/appointments`
- `POST /api/appointments`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/recruitment/jobs`
- `POST /api/recruitment/applications`
- `GET /api/admin/users`
- `POST /api/admin/doctors`
- `GET /api/admin/audit-logs`
- `GET /api/doctor/appointments`
- `POST /api/legal/consents`

Authenticated routes require a bearer access token. Unsafe methods require a valid CSRF header.
