# Frontend Route Map

## Canonical Routes

- `/` -> landing
- `/login` -> login form -> `POST /api/auth/login`
- `/register` -> registration form -> `POST /api/auth/register`
- `/dashboard` -> reports, appointments, health history, subscription, AI usage
- `/reports` -> report list/upload -> `GET/POST /api/reports`
- `/report/:id` -> report detail/analyze -> `GET /api/reports/:id`, `POST /api/reports/:id/analyze`
- `/chat` -> consultations/messages -> `GET /api/consultations`, `GET/POST /api/consultations/:id/messages`
- `/doctors` -> doctor directory -> `GET /api/doctors`
- `/doctor/:id` -> doctor profile/booking -> `GET /api/doctors/:id`, `POST /api/appointments`
- `/appointments` -> appointment list -> `GET /api/appointments`
- `/profile` -> profile/settings -> `GET/PUT /api/me`
- `/settings` -> static settings shell
- `/subscription` -> plans, usage, checkout -> subscription/payment APIs
- `/checkout` -> same subscription checkout renderer
- `/payment-success` -> verifies payment -> `POST /api/subscriptions/verify`
- `/payment-failed` -> payment failure state
- `/billing-history` -> `GET /api/subscriptions/billing-history`
- `/update-plan` -> subscription renderer
- `/cancel-subscription` -> `POST /api/subscriptions/cancel`
- `/privacy`, `/terms`, `/data-policy` -> `GET /api/legal/policies`
- `/consent` -> consent center -> legal consent APIs
- `/help`, `/contact` -> intentional static support pages
- `/sitemap` -> route-style directory

## Doctor Workspace

- `/doctor`
- `/doctor/patient-queue`
- `/doctor/appointments`
- `/doctor/consultations`
- `/doctor/medical-reports`
- `/doctor/messages`
- `/doctor/profile`
- `/doctor/verification-status`
- `/doctor/analytics`
- `/doctor/settings`

All render through the doctor workspace shell and use `/api/doctor/*`, `/api/appointments`, and `/api/consultations`.

## Admin Workspace

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

All render through the admin workspace shell. Coupon management uses `/api/admin/coupons`.

## Legacy Redirects

Legacy generated `.html` paths are not canonical navigation. The Express app redirects them to route-style paths, for example:

- `/app/dashboard.html` -> `/dashboard`
- `/auth/login.html` -> `/login`
- `/premium/plans.html` -> `/subscription`
- `/consultation/find-doctor.html` -> `/doctors`
- `/admin/index.html` -> `/admin`
- `/sitemap.html` -> `/sitemap`
