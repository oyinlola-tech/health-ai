# Architecture Diagram

Generated: 2026-06-07

```text
Browser SPA
  |
  | canonical routes: /dashboard, /reports, /chat, /subscription, /admin
  v
Express app
  |
  +-- static assets and legacy .html redirects
  +-- helmet, CORS, compression, cookies, request id
  +-- /api -> rate limit -> sanitize -> CSRF -> routes
  |
  v
Routes -> Controllers -> Services -> Repositories -> MySQL
```

## Core Modules

```text
Auth
  -> authRoutes
  -> authController
  -> authService
  -> userRepository / token persistence
  -> JWT access token + httpOnly refresh cookie
  -> trialService starts patient trial on registration

Reports and AI
  -> reportRoutes / aiRoutes
  -> entitlementGuard + AI endpoint rate limits
  -> reportService / aiService
  -> report processing, RAG retrieval, Gemini gateway
  -> structured response + usage tracking

Payments
  -> subscriptionRoutes
  -> subscriptionController
  -> subscriptionService
  -> billingRepository
  -> OPay service/webhook
  -> subscriptions + entitlements + billing events

Promotions
  -> admin coupon routes
  -> couponController
  -> couponService
  -> coupons + coupon_redemptions
  -> backend-only price recalculation and zero-NGN checkout skip

Doctor Workflow
  -> doctorMarketplaceRoutes / doctorRoutes / appointmentRoutes
  -> doctor, appointment, consultation repositories
  -> patient booking entitlement checks
  -> doctor-only appointment/report views

Admin Workflow
  -> adminRoutes
  -> adminController
  -> adminService
  -> users, doctors, analytics, payments, AI costs, audit logs, coupons
```

## Patient Flow

```text
/register
  -> POST /api/auth/register
  -> user created in MySQL
  -> user_trials active for 14 days

/login
  -> POST /api/auth/login
  -> access token + refresh cookie

/reports
  -> POST /api/reports
  -> upload validation + storage + report row

/report/:id
  -> POST /api/reports/:id/analyze
  -> entitlement check
  -> deterministic extraction/classification where available
  -> RAG context
  -> Gemini structured response
  -> report history and usage saved

/subscription
  -> GET /api/subscriptions/me
  -> POST /api/subscriptions/checkout
  -> coupon/trial/OPay path
```

## Payment Flow

```text
User selects plan
  -> backend validates plan, consent, coupon, and final NGN amount
  -> if final amount is 0: create verified internal payment, activate subscription, update entitlements
  -> if final amount is > 0: initialize OPay checkout
  -> OPay sends webhook
  -> signature, replay key, amount, currency, and reference are verified
  -> payment marked verified
  -> subscription activated
  -> entitlements written
  -> browser success page reads local backend status only
```

## Security Boundaries

- Frontend never decides payment success or entitlement access.
- Sensitive API routes require authentication and role checks.
- AI/report/payment endpoints are rate limited.
- Uploads are validated by MIME type, size, and content checks.
- Payment payloads are redacted/encrypted before persistence where supported.
- OPay webhook processing prevents duplicate replay keys and duplicate provider transactions.
