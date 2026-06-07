# Development Payment Simulator

Local development can run without OPay credentials by enabling the built-in simulator:

```env
NODE_ENV=development
OPAY_MOCK_MODE=true
```

When both values are set, the server does not call OPay and does not require `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, `OPAY_SECRET_KEY`, or `OPAY_WEBHOOK_SECRET` at startup.

## Behavior

- Checkout creates normal payment attempts, payment rows, payment transactions, and billing events.
- The simulated checkout URL points back to the local payment success route with the generated payment reference.
- Payment verification generates a deterministic simulated OPay transaction ID.
- Verification records a simulated webhook event, marks the payment as verified, activates the subscription, updates entitlements, tracks analytics, and dispatches email events through the existing event pipeline.
- Webhook processing accepts simulated successful verification in development mock mode.

## Production Safety

`OPAY_MOCK_MODE` is ignored unless `NODE_ENV=development`.

In production, real OPay credentials and webhook secrets are still required. Startup validation fails when production payment credentials are missing, even if `OPAY_MOCK_MODE=true`.
