# API Map

Base path: `/api`

## Health and Config

- `GET /health` -> `configController.health`
- `GET /config/public` -> `configController.public`

## Auth

- `GET /auth/csrf` -> issue CSRF token
- `POST /auth/register` -> register patient and start trial
- `POST /auth/login` -> login and issue tokens
- `POST /auth/logout` -> revoke refresh token
- `POST /auth/refresh` -> rotate refresh token
- `POST /auth/password-reset/request` -> request password reset
- `POST /auth/password-reset/confirm` -> complete password reset
- `POST /auth/email/verify` -> verify email token

## Profile

- `GET /me` -> current user
- `PUT /me` -> update profile

## Reports and AI

- `GET /reports` -> list user reports
- `POST /reports` -> upload report
- `GET /reports/:id` -> report detail
- `POST /reports/:id/analyze` -> entitlement-checked AI analysis
- `DELETE /reports/:id` -> soft delete report
- `GET /ai/usage/me` -> current AI usage
- `GET /ai/usage/summary` -> admin AI summary
- `GET /ai/usage/user/:id` -> admin user AI usage
- `GET /ai/usage/costs` -> admin AI cost view
- `GET /ai/usage/dashboard` -> admin AI dashboard
- `POST /ai/chat` -> entitlement-checked AI chat
- `GET /ai/chat-history` -> chat history
- `POST /ai/feedback` -> AI feedback

## Doctor and Consultation

- `GET /doctors` -> public verified doctor directory
- `GET /doctors/:id` -> public verified doctor profile
- `PUT /doctor/profile` -> doctor profile update
- `POST /doctor/availability` -> doctor availability
- `POST /doctor/unavailable-slots` -> doctor unavailable slot
- `GET /doctor/appointments` -> doctor appointments
- `GET /doctor/reports` -> consent-filtered assigned reports
- `GET /appointments` -> user appointments
- `POST /appointments` -> entitlement-checked appointment booking
- `PATCH /appointments/:id/status` -> appointment status update
- `GET /consultations` -> user consultation rooms
- `GET /consultations/:id/messages` -> consultation messages
- `POST /consultations/:id/messages` -> send consultation message

## Subscriptions and Payments

- `GET /subscriptions/plans` -> plan list
- `GET /subscriptions/me` -> current plan, usage, trial, billing
- `POST /subscriptions/coupons/validate` -> validate coupon
- `POST /subscriptions/checkout` -> initialize backend-owned checkout
- `POST /subscriptions/verify` -> server-side OPay verification
- `POST /subscriptions/cancel` -> cancel subscription
- `GET /subscriptions/billing-history` -> billing history
- `POST /subscriptions/refunds` -> request refund
- `POST /payments/opay/webhook` -> OPay webhook processor

## Admin

- `GET /admin/users` -> admin user list
- `POST /admin/doctors` -> admin-created doctor account
- `GET /admin/analytics` -> admin analytics
- `GET /admin/monetization` -> monetization metrics
- `GET /admin/ai-costs` -> AI cost dashboard
- `GET /admin/reports/processing-metrics` -> report processing metrics
- `GET /admin/audit-logs` -> audit logs
- `GET /admin/coupons` -> coupon list
- `POST /admin/coupons` -> create coupon
- `GET /admin/coupons/:id/usage` -> coupon usage
- `POST /admin/coupons/:id/disable` -> disable coupon
- `PATCH /admin/doctors/:id/verification` -> doctor verification

## Recruitment

- `GET /recruitment/jobs` -> public doctor jobs
- `POST /recruitment/applications` -> submit doctor application
- `POST /recruitment/applications/status` -> public application status
- `POST /recruitment/jobs` -> admin create job
- `PATCH /recruitment/jobs/:id/publish` -> admin publish job
- `GET /recruitment/applications` -> admin applications
- `PATCH /recruitment/applications/:id/review` -> admin review application

## Legal, Notifications, Health

- `GET /legal/policies` -> legal policies
- `POST /legal/consents` -> record consent
- `GET /legal/consents/status` -> consent status
- `POST /legal/consents/status` -> set operational consent
- `GET /legal/consents/history` -> consent history
- `GET /notifications` -> notifications
- `PATCH /notifications/:id/read` -> mark notification read
- `GET /health-history` -> health history
- `POST /health-history` -> create health history entry
