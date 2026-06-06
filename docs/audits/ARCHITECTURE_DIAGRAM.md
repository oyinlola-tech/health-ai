# Architecture Diagram

```text
Browser SPA
  |
  | route-style navigation
  v
Express app
  |
  | /api/*
  v
Routes -> Controllers -> Services -> Repositories -> MySQL/AMPPS
  |
  +-- Auth: JWT access token + httpOnly refresh cookie + CSRF
  +-- Reports: upload middleware -> OCR/report processing -> report repository
  +-- AI: entitlement check -> RAG retrieval -> Gemini gateway -> structured response -> history
  +-- Payments: checkout -> OPay -> webhook verification -> subscription -> entitlements
  +-- Doctors: admin-created doctors -> availability -> appointments -> consultations/chat
  +-- Admin: users, doctors, reports, AI usage, monetization, coupons, audit logs
```

## Patient Flow

`/register -> /login -> /dashboard -> /reports -> /report/:id -> /chat -> /subscription`

Backend path:

`authRoutes -> reportRoutes -> aiRoutes -> subscriptionRoutes`

## Doctor Flow

`/login -> /doctor -> /doctor/appointments -> /chat`

Backend path:

`doctorRoutes -> doctorMarketplaceRoutes -> consultationRepository`

## Admin Flow

`/login -> /admin -> /admin/users -> /admin/coupons -> /admin/payments`

Backend path:

`adminRoutes -> adminController -> adminService -> repositories`

## Payment Flow

```text
User selects plan
  -> POST /api/subscriptions/checkout
  -> backend validates plan/coupon
  -> OPay checkout initialized
  -> OPay webhook calls /api/payments/opay/webhook
  -> signature/replay/amount/reference checks
  -> payment marked verified
  -> subscription activated
  -> entitlements updated
```

## AI Flow

```text
AI request
  -> route entitlement guard
  -> service entitlement guard
  -> RAG trusted context
  -> Gemini backend gateway
  -> JSON schema validation
  -> history + usage saved
```
