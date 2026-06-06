# Payment Implementation Report

## Scope

The monetization system now uses a server-side OPay payment architecture. Frontend payment status is never trusted.

Implemented files:

- `src/services/opayClient.js`
- `src/services/subscriptionService.js`
- `src/repositories/billingRepository.js`
- `src/controllers/subscriptionController.js`
- `src/routes/subscriptionRoutes.js`
- `src/migrations/004_opay_monetization.sql`

## OPay Flow

1. Authenticated patient selects a paid plan.
2. Backend creates a `payment_attempts` record.
3. Backend initializes OPay Cashier checkout.
4. Backend stores `payments`, checkout URL, and a `payment_transactions` audit row.
5. User completes payment on OPay.
6. Backend verifies payment through OPay before activating premium.
7. OPay webhooks are signature-validated and replay-protected before processing.

## Implemented Payment Features

- Payment initialization
- Payment verification
- Webhook processing
- Payment status updates
- Subscription activation
- Subscription cancellation
- Refund request support
- Billing events
- Transaction audit rows

## Security Controls

- OPay credentials are read only from environment variables.
- Webhook signature validation uses HMAC SHA-512.
- Webhook replay keys are uniquely indexed.
- Client totals are ignored; plan price comes from MySQL.
- Payment verification is server-side only.
- Internal provider requests and secrets are not exposed to the frontend.

## Required Environment

- `OPAY_BASE_URL`
- `OPAY_MERCHANT_ID`
- `OPAY_PUBLIC_KEY`
- `OPAY_SECRET_KEY`
- `OPAY_WEBHOOK_SECRET`
- `OPAY_COUNTRY`
- `OPAY_CURRENCY`
