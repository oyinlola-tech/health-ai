# Threat Model

## Scope

In scope:

- Express API server
- MySQL-backed repositories
- AI/Gemini gateway
- OCR/report upload flow
- OPay payment flow
- Socket.io realtime layer
- Browser frontend served from `public`

Out of scope:

- Cloud perimeter controls
- TLS termination configuration
- External OPay and Gemini internals
- Email provider security controls

## Assets

- Patient medical reports and extracted text
- AI analysis and chat history
- Doctor-patient consultation messages
- Subscription/payment records
- OPay webhook integrity
- JWT and refresh-token session state
- Admin and doctor privileges
- Audit logs and billing events

## Trust Boundaries

- Browser to Express API over HTTPS in production
- Browser Socket.io client to realtime server with JWT auth
- Express API to MySQL with parameterized queries
- Express API to OPay with signed requests/webhooks
- Express API to Gemini through backend-only gateway
- Upload parser/OCR boundary for attacker-supplied files

## Attacker Capabilities

Assumed attackers can:

- Register patient accounts
- Submit arbitrary API payloads
- Upload spoofed or malicious files
- Attempt IDOR by guessing UUIDs
- Attempt prompt injection through report contents and chat
- Replay or forge payment/webhook payloads
- Attempt unauthorized socket room joins
- Abuse login, upload, and AI endpoints

Not assumed:

- Direct database access
- Server filesystem shell access
- Compromise of OPay/Gemini provider infrastructure

## Priority Threats

### T1: Cross-Patient Medical Data Exposure

Impact: high. Likelihood: medium.

Controls added:

- patient ownership checks
- doctor assigned-patient checks
- fixed doctor report listing leak
- WebSocket room authorization

### T2: Malicious Upload Processing

Impact: high. Likelihood: high.

Controls added:

- MIME and extension allowlist
- magic-byte validation
- path traversal containment
- max size limits
- rejected-file deletion
- EICAR malware hook

### T3: Prompt Injection Against Gemini

Impact: high. Likelihood: high.

Controls added:

- prompt injection pattern blocking
- untrusted-content boundaries
- system prompt hierarchy instructions
- backend-only AI gateway
- no raw prompt persistence in AI interaction logs

### T4: Payment Forgery or Replay

Impact: high. Likelihood: medium.

Controls added:

- timing-safe webhook signature comparison
- replay-key uniqueness
- server-side OPay verification
- amount/currency integrity checks
- payment transaction audit records

### T5: Session or Role Abuse

Impact: high. Likelihood: medium.

Controls added:

- JWT issuer/audience/type/algorithm enforcement
- refresh-token rotation
- disabled/deleted-user refresh rejection
- role-gated routes
- sensitive auth throttling

## Residual Risks

- Full malware scanning requires production AV integration.
- Access tokens remain JavaScript-readable in `sessionStorage`.
- Append-only/tamper-resistant audit log storage is an infrastructure requirement not visible in repo code.
- HSTS/TLS deployment posture must be validated outside the app.
