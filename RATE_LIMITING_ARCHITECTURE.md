# Rate Limiting Architecture

## Summary

MedExplain AI uses global and module-specific rate limiting with per-user/IP keys and temporary abuse bans.

## Applied Limits

- Global API: `apiRateLimit`
- Authentication: `authRateLimit` and `sensitiveAuthRateLimit`
- AI: `aiEndpointRateLimit`
- Uploads: `uploadRateLimit`
- Payments: `paymentRateLimit`
- OPay webhooks: `webhookRateLimit`
- Doctor booking: `bookingRateLimit`

## Abuse Bans

The rate-limit middleware records temporary in-memory bans when a caller exceeds module limits. Authenticated requests are keyed by user ID; unauthenticated requests use IPv6-safe IP keys.

## Notes

For multi-instance production deployments, move abuse-ban state to Redis or another shared store so limits apply consistently across instances.

