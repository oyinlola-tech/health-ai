# Webhook Security

OPay webhooks are accepted at:

`POST /api/payments/opay/webhook`

## Controls

- Raw JSON request body is captured before parsing for signature verification.
- CSRF is bypassed only for the webhook route because OPay cannot provide a browser CSRF token.
- Webhook requests remain covered by API rate limiting and payment webhook abuse guard.
- Signatures are verified with `OPAY_WEBHOOK_SECRET` or `OPAY_SECRET_KEY`.
- Signature comparison uses timing-safe comparison.
- Replay attacks are blocked with a unique `(provider, replay_key)` constraint.
- Duplicate provider transaction IDs are rejected when they map to a different payment.
- Amount, currency, and reference are checked against local payment records before activation.
- Stored raw webhook payloads are redacted and encrypted with AES-256-GCM before being written to billing tables.

## Processing Rule

Frontend payment completion is never trusted. Subscription activation happens only after backend verification or a valid OPay webhook confirms the transaction.
