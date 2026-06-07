# API Validation Report

Generated: 2026-06-07

## Result

PASS for core APIs tested.

## Verified Endpoints

- `GET /api/health`: 200
- `GET /api/config/public`: 200
- `POST /api/auth/register`: 201
- `POST /api/auth/login`: 200
- `POST /api/auth/refresh`: 200
- `POST /api/auth/logout`: 200
- `POST /api/auth/password-reset/request`: 200
- `GET /api/me`: 200
- `GET /api/admin/users`: 200
- `GET /api/admin/audit-logs`: 200
- `GET /api/admin/reports/processing-metrics`: 200
- `GET /api/admin/monetization`: 200
- `GET /api/admin/ai-costs`: 200
- `GET /api/admin/coupons`: 200
- `GET /api/reports`: 200
- `GET /api/ai/chat-history`: 200
- `GET /api/notifications`: 200
- `GET /api/subscriptions/plans`: 200
- `GET /api/subscriptions/me`: 200
- `GET /api/doctors`: 200
- `GET /api/recruitment/jobs`: 200
- `GET /api/medical-knowledge`: 200

## Fixes Applied

- Coupon list SQL fixed for MySQL aggregation.
- Coupon mutations hardened for MySQL.
- Event dispatch changed to avoid blocking response flush.
- Added admin-only Gemini diagnostic endpoint.

## Notes

- CSRF is enforced for unsafe API methods.
- 401/403 behaviors remain intentional for missing authentication, invalid CSRF, and role/entitlement denial.
