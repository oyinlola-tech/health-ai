# Entitlement System

Sensitive MedExplain AI features are protected by backend entitlement checks.

## Protected Actions

- AI chat: `AI_CHAT`
- Report analysis: `REPORT_ANALYSIS`
- Doctor booking: `DOCTOR_CONSULTATION`
- Premium RAG: `ADVANCED_AI_EXPLANATIONS`

## Enforcement Points

- Route guard: `src/modules/payments/entitlement.guard.js`
- Service guard: `src/services/entitlementService.js`
- Usage writes: `billingRepository.incrementUsage`

Route-level guards block early and return upgrade metadata. Service-level checks remain in place as defense-in-depth for direct service calls and future routes.

Entitlements are written only by subscription activation paths: free/trial bootstrap, server-approved zero-total promotional checkout, or signed OPay webhook processing for paid checkout.

## Upgrade Response

When access is insufficient, the API returns a forbidden error with:

- feature code
- upgrade path `/subscription`
- upgrade prompt

The frontend displays usage and plan context, but all allow/block decisions happen on the backend.
