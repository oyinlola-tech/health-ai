# OPay Integration

MedExplain AI uses OPay as the primary external payment provider for paid subscription checkout.

## Server-Owned Flow

1. The frontend calls `POST /api/subscriptions/checkout` with a plan code and optional coupon.
2. The backend loads pricing from the database and promotion rules.
3. The backend creates a local payment attempt and payment record.
4. The backend initializes OPay checkout through `opayClient`.
5. OPay returns a hosted checkout URL.
6. The frontend redirects the user to that URL only after the backend returns it.

The browser never calculates final payment authority and never activates access.

## Module Files

- `src/modules/payments/opay.service.js`: payment initialization and provider verification facade.
- `src/modules/payments/opay.webhook.js`: webhook request adapter and signature extraction.
- `src/services/opayClient.js`: low-level OPay API client.
- `src/services/subscriptionService.js`: checkout, verification, activation, refund, and webhook orchestration.

## Audit Records

The system records:

- `payment_attempts`
- `payments`
- `payment_transactions`
- `payment_webhooks`
- `billing_events`

All activation requires a verified backend-side payment or a server-approved zero-total promotional checkout.

Provider request and response payloads are retained for auditability, but sensitive fields are redacted and encrypted before storage.
