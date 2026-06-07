# Frontend Route Map

Generated: 2026-06-07

The production frontend is served from `public/index.html` as a route-style shell. Legacy generated `.html` files remain in `public/` for compatibility, but Express redirects those paths to canonical routes.

## Patient Routes

- `/` -> landing page.
- `/login` -> login form -> `POST /api/auth/login`.
- `/register` -> registration form -> `POST /api/auth/register`.
- `/dashboard` -> patient overview; loads reports, appointments, health history, subscription, and AI usage APIs.
- `/reports` -> report upload and report list -> `GET /api/reports`, `POST /api/reports`.
- `/report/:id`, `/reports/:id`, `/analysis/:id` -> report detail and analysis -> `GET /api/reports/:id`, `POST /api/reports/:id/analyze`.
- `/chat` -> AI/consultation conversation workspace -> AI and consultation APIs.
- `/doctors` -> doctor directory -> `GET /api/doctors`.
- `/doctor/:id` -> doctor profile and booking -> `GET /api/doctors/:id`, `POST /api/appointments`.
- `/appointments` -> appointment list -> `GET /api/appointments`.
- `/profile` -> current profile -> `GET /api/me`, `PUT /api/me`.
- `/settings` -> intentional static settings shell.

## Subscription and Payment Routes

- `/subscription` -> plans, usage, trial countdown, coupon quote, checkout -> subscription APIs.
- `/checkout` -> same checkout renderer as subscription.
- `/update-plan` -> same plan selection renderer as subscription.
- `/billing-history` -> billing history -> `GET /api/subscriptions/billing-history`.
- `/cancel-subscription` -> cancellation action -> `POST /api/subscriptions/cancel`.
- `/payment-success` -> local payment status read -> `POST /api/subscriptions/verify`.
- `/payment-failed` -> failed/pending payment state.

## Legal and Support Routes

- `/privacy`, `/terms`, `/data-policy` -> legal policies -> `GET /api/legal/policies`.
- `/consent` -> consent center -> legal consent APIs.
- `/help` -> intentional static help page.
- `/contact` -> intentional static support page.
- `/sitemap` -> route directory.

## Doctor Workspace Routes

These routes render through the doctor workspace shell and call doctor, appointment, report, and consultation APIs.

- `/doctor`
- `/doctor-dashboard`
- `/doctor/patient-queue`
- `/doctor/appointments`
- `/doctor/consultations`
- `/doctor/medical-reports`
- `/doctor/messages`
- `/doctor/profile`
- `/doctor/verification-status`
- `/doctor/analytics`
- `/doctor/settings`

## Admin Workspace Routes

These routes render through the admin workspace shell and call admin APIs. `/admin/coupons` has a dedicated coupon management renderer.

- `/admin`
- `/admin/users`
- `/admin/doctors`
- `/admin/doctor-applications`
- `/admin/reports`
- `/admin/ai-usage`
- `/admin/payments`
- `/admin/subscriptions`
- `/admin/coupons`
- `/admin/security-logs`
- `/admin/audit-logs`
- `/admin/system-settings`
- `/admin/system`
- `/admin/jobs`
- `/admin/analytics`

## State Routes

- Success: `/success/report-uploaded`, `/success/analysis-complete`, `/success/appointment-booked`, `/success/payment`, `/success/subscription-activated`, `/success/doctor-application`, `/success/profile-updated`, `/success/password-changed`.
- Errors: `/error/400`, `/error/401`, `/error/403`, `/error/404`, `/error/408`, `/error/429`, `/error/500`, `/error/database`, `/error/ai`, `/error/report-processing`, `/error/ocr`, `/error/payment`, `/error/subscription-expired`, `/error/doctor-unavailable`, `/error/booking`, `/error/chat-disconnected`, `/error/file-too-large`, `/error/file-type`.
- Empty states: `/empty/no-reports`, `/empty/no-appointments`, `/empty/no-notifications`, `/empty/no-doctors`, `/empty/no-search-results`, `/empty/no-chat-history`, `/empty/no-health-history`, `/empty/no-payments`, `/empty/no-subscriptions`, `/empty/no-ai-analyses`.
- System: `/maintenance`, `/offline`.

## Legacy Redirect Examples

- `/index.html` -> `/`
- `/sitemap.html` -> `/sitemap`
- `/auth/login.html` -> `/login`
- `/auth/signup.html` -> `/register`
- `/app/dashboard.html` -> `/dashboard`
- `/app/upload.html` -> `/reports`
- `/app/ai-analysis.html` -> `/chat`
- `/premium/plans.html` -> `/subscription`
- `/premium/payment.html` -> `/update-plan`
- `/consultation/find-doctor.html` -> `/doctors`
- `/admin/index.html` -> `/admin`
