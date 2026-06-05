# Entitlement System Report

## Scope

The entitlement engine gates premium and limited free features before use.

Implemented files:

- `src/services/entitlementService.js`
- `src/middlewares/entitlements.js`
- `src/services/aiService.js`
- `src/services/appointmentService.js`

## Middleware

Created:

- `requirePremium`
- `requireDoctorAccess`
- `requireUnlimitedAnalysis`

These middleware functions use the same entitlement engine as the service layer.

## Gated Features

- Report analysis
- AI chat
- Doctor consultations
- Advanced AI explanations
- Health trend analytics entitlement support
- Priority processing entitlement support

## Usage Tracking

Monthly counters are stored in `usage_tracking`:

- `REPORT_ANALYSIS`
- `AI_CHAT`
- `DOCTOR_CONSULTATION`

Usage is recorded after successful actions.

## Limit Errors

When a user exceeds a free-plan limit, the API returns a structured error:

```json
{
  "code": "PLAN_LIMIT_REACHED",
  "feature": "REPORT_ANALYSIS"
}
```

The exact feature is included in the error details so the frontend can show an upgrade path.

