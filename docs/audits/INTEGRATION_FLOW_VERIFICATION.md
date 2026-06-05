# Integration Flow Verification

## Patient Flow

Verified at code and route level:

- Register and login continue through backend auth responses.
- Dashboard routes use shared shell, navigation, loading, and error states.
- Report upload remains backend-mediated and displays reports from real API data.
- AI analysis remains gated through backend report and AI services.
- Doctor discovery uses real `/doctors` API data with debounced filtering.
- Appointments and chat routes use real consultation and messaging APIs.
- Subscription and billing routes use backend OPay checkout/history responses.

## Doctor Flow

Verified at code and route level:

- `/doctor` and doctor workspace routes share the common shell.
- Doctor dashboard uses real appointment/report API data.
- Availability saving calls `/doctor/availability` and rerenders the workspace after success.
- Consultation rooms route users into the shared chat interface.

## Admin Flow

Verified at code and route level:

- Admin dashboard keeps one consistent layout for users, audit logs, reports, AI usage, payments, subscriptions, and system settings.
- Doctor applications now load from the recruitment API.
- AI cost and monetization cards remain backed by existing admin endpoints.

## API Contract

Application controllers use the shared response helpers:

- `sendSuccess(res, data)` for success payloads
- `sendError(res, error, statusCode)` for failures

Production server errors are redacted and do not expose stack traces.

## Verification Commands

```bash
npm.cmd run lint
npm.cmd test
npm.cmd audit
git diff --check
npm.cmd run migrate
```

## Results

- Lint: passed
- Tests: 9 passed, 1 skipped
- Test cases: 33 passed, 10 skipped
- Dependency audit: 0 vulnerabilities
- Diff check: passed
- Migration command: blocked locally by PostgreSQL password authentication for user `postgres`
