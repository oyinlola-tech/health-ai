# Runtime Failure Report

Environment: local development, `NODE_ENV=development`, `OPAY_MOCK_MODE=true`, port `3100`.

| Route | Failing API | HTTP status | Stack trace | Root cause | Fix applied |
| --- | --- | ---: | --- | --- | --- |
| Startup/payment checkout | OPay cashier/status APIs | Startup risk | `opayClient.requireOpayConfig` would throw when checkout reached missing credentials | Local development had no OPay credentials | Added development OPay simulator gated by `NODE_ENV=development` and `OPAY_MOCK_MODE=true`; production still requires real credentials |
| Any API error response | Any API route with thrown error | HTML error page | Express default error page showed `AppError: Invalid CSRF token` | `errorHandler` had 3 parameters, so Express did not register it as error middleware | Changed signature to `(error, req, res, _next)` so APIs return JSON errors |
| `/api/legal/consents/status` | `POST /api/legal/consents/status` | 500 | `ER_WRONG_ARGUMENTS Incorrect arguments to COM_STMT_EXECUTE` | DB adapter collapsed repeated `$4` placeholders into repeated `?` markers without duplicating params | Added placeholder expansion that duplicates repeated parameter values |
| `/api/admin/users` | `GET /api/admin/users` | 500 | `ER_WRONG_ARGUMENTS Incorrect arguments to mysqld_stmt_execute` | MySQL prepared statements rejected numeric `LIMIT ? OFFSET ?` values in this environment | Coerced prepared LIMIT/OFFSET params to safe non-negative strings in DB adapter |
| `/api/admin/audit-logs` | `GET /api/admin/audit-logs` | 500 | Same as above | Same LIMIT/OFFSET prepared-parameter issue | Same DB adapter fix |
| `/settings` | `GET/PUT /api/me/settings`, `PUT /api/me/password` | Missing functionality | N/A | Route rendered a static guidance page only | Added settings APIs and connected a real settings renderer |

Validation: health/config/auth/profile/reports list/subscriptions/notifications/consents/payment simulator/admin APIs/doctor APIs now pass direct API probes.
