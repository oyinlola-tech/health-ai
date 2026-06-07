# API Map

Generated: 2026-06-07

Base path: `/api`

## Health and Config

- `GET /health` -> `configController.health` -> public service/database/config health.
- `GET /config/public` -> `configController.public` -> public frontend configuration.

## Auth

- `GET /auth/csrf` -> CSRF token endpoint.
- `POST /auth/register` -> validate registration, create patient, start 14-day trial.
- `POST /auth/login` -> validate credentials, issue access token and refresh cookie.
- `POST /auth/logout` -> revoke refresh token.
- `POST /auth/refresh` -> rotate refresh token.
- `POST /auth/password-reset/request` -> request reset token.
- `POST /auth/password-reset/confirm` -> set new password.
- `POST /auth/email/verify` -> verify email token.

## Current User

All routes require authentication.

- `GET /me` -> current user profile.
- `PUT /me` -> validate and update profile.

## Reports

All routes require authentication.

- `GET /reports` -> list user-visible reports.
- `POST /reports` -> patient-only upload with upload rate limit and file validation.
- `GET /reports/:id` -> report detail.
- `POST /reports/:id/analyze` -> AI rate limit, report-analysis entitlement, analysis pipeline.
- `DELETE /reports/:id` -> soft delete report.

## AI

All routes require authentication.

- `GET /ai/usage/me` -> current user usage.
- `GET /ai/usage/summary` -> admin-only AI usage summary.
- `GET /ai/usage/user/:id` -> admin-only user usage.
- `GET /ai/usage/costs` -> admin-only AI cost data.
- `GET /ai/usage/dashboard` -> admin-only AI dashboard.
- `POST /ai/chat` -> AI rate limit, AI-chat entitlement, structured chat response.
- `GET /ai/chat-history` -> user chat history.
- `POST /ai/feedback` -> AI feedback capture.

## Doctor Marketplace and Consultations

- `GET /doctors` -> public verified doctor directory.
- `GET /doctors/:id` -> public verified doctor profile.
- `PUT /doctor/profile` -> doctor-only profile update.
- `POST /doctor/availability` -> doctor-only availability.
- `POST /doctor/unavailable-slots` -> doctor-only blocked slot.
- `GET /doctor/appointments` -> doctor-only appointment list.
- `GET /doctor/reports` -> doctor-only assigned reports.
- `GET /appointments` -> authenticated appointment list.
- `POST /appointments` -> booking rate limit, doctor-consultation entitlement, create appointment.
- `PATCH /appointments/:id/status` -> appointment status update.
- `GET /consultations` -> authenticated consultation rooms.
- `GET /consultations/:id/messages` -> consultation messages.
- `POST /consultations/:id/messages` -> validate and send consultation message.
- `PATCH /admin/doctors/:id/verification` -> admin-only doctor verification.

## Subscriptions, Promotions, and Payments

- `POST /payments/opay/webhook` -> public OPay webhook entry with abuse guard, webhook rate limit, signature validation, replay protection, and server-side activation.

All routes below require authentication.

- `GET /subscriptions/plans` -> subscription plan list.
- `GET /subscriptions/me` -> current plan, usage, trial, coupon access, and billing history.
- `POST /subscriptions/coupons/validate` -> coupon abuse guard, rate limit, validation, backend price quote.
- `POST /subscriptions/checkout` -> payment abuse guard, rate limit, backend-owned checkout or zero-NGN activation.
- `POST /subscriptions/verify` -> read local payment status; does not activate paid OPay access.
- `POST /subscriptions/cancel` -> cancel active subscription.
- `GET /subscriptions/billing-history` -> user billing history.
- `POST /subscriptions/refunds` -> request refund for verified payment.

## Admin

All routes require authentication and `Admin` role.

- `GET /admin/users` -> user list.
- `POST /admin/doctors` -> create doctor account.
- `GET /admin/analytics` -> product analytics.
- `GET /admin/monetization` -> subscription/payment metrics.
- `GET /admin/ai-costs` -> AI cost dashboard.
- `GET /admin/reports/processing-metrics` -> report processing metrics.
- `GET /admin/audit-logs` -> audit log list.
- `GET /admin/coupons` -> coupon list and usage summary.
- `POST /admin/coupons` -> create secure coupon.
- `GET /admin/coupons/:id/usage` -> coupon redemption detail.
- `POST /admin/coupons/:id/disable` -> disable coupon.

## Recruitment

- `GET /recruitment/jobs` -> public doctor jobs.
- `POST /recruitment/applications` -> public application submit with CSRF, rate limit, upload validation.
- `POST /recruitment/applications/status` -> public application status lookup with CSRF and rate limit.
- `POST /recruitment/jobs` -> admin-only create job.
- `PATCH /recruitment/jobs/:id/publish` -> admin-only publish job.
- `GET /recruitment/applications` -> admin-only applications.
- `PATCH /recruitment/applications/:id/review` -> admin-only review decision.

## Legal, Notifications, and Health History

- `GET /legal/policies` -> public legal policies.
- `POST /legal/consents` -> authenticated consent record.
- `GET /legal/consents/status` -> authenticated consent status.
- `POST /legal/consents/status` -> authenticated operational consent update.
- `GET /legal/consents/history` -> authenticated consent history.
- `GET /notifications` -> authenticated notifications.
- `PATCH /notifications/:id/read` -> authenticated mark read.
- `GET /health-history` -> patient-only health history.
- `POST /health-history` -> patient-only create health history entry.
