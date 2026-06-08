# Development Mode Guide

Generated: 2026-06-07

## Required Local Mode

```env
NODE_ENV=development
OPAY_MOCK_MODE=true
```

## Development Behavior

- OPay credentials are not required when `NODE_ENV=development` and `OPAY_MOCK_MODE=true`.
- OPay API calls are not made in mock mode.
- Simulated payment references and successful verification payloads are generated.
- SMTP credentials are not required in development.
- Email events are queued/logged and delivery is skipped with a structured log when SMTP is absent.

## Not Bypassed

- Authentication
- Authorization
- CSRF
- Rate limiting
- Database validation
- Entitlement checks

## Production Safety

- In production, OPay mock mode is ignored by startup validation.
- Production requires Gemini, OPay, webhook, JWT, cookie, CSRF, message encryption, and payment encryption secrets.
