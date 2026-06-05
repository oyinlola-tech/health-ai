# Payment Security Audit

## Summary

OPay payment handling is server-authoritative. The frontend can initiate checkout and display results, but payment status is trusted only after backend verification or a valid webhook.

## Implemented Controls

- Server-side payment verification only through `subscriptionService.verifyPayment`.
- OPay webhook signature validation using HMAC and constant-time comparison.
- Replay prevention through `payment_webhooks` unique replay keys.
- Payment provider transaction uniqueness through `payment_transactions`.
- Amount, currency, and reference integrity checks before activation.
- Fraud flags for payment integrity mismatches.
- Billing events for payment initialization, verification, subscription activation, and fraud flags.
- Failed transactions are persisted when OPay verification does not confirm payment.
- Payment routes have module-specific rate limits and temporary abuse bans.

## No Frontend Trust

The frontend success page posts the payment reference to the backend. Premium access is activated only after the backend confirms the payment with OPay or accepts a signed webhook.

## Remaining Operations

Production must configure real OPay credentials:

- `OPAY_MERCHANT_ID`
- `OPAY_PUBLIC_KEY`
- `OPAY_SECRET_KEY`
- `OPAY_WEBHOOK_SECRET`

