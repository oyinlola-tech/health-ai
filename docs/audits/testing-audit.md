# Testing Audit

Generated: 2026-06-06

## Result

Tests exist locally and pass, but the `tests/` folder is intentionally ignored and untracked after the prior Git request.

## Verification

- `npm test`: 10 files passed, 1 skipped; 37 tests passed, 10 skipped.
- `npm run smoke:frontend`: pass.
- `npm run audit:integrity`: pass.
- `npm run lint`: pass.
- `npm audit --audit-level=high`: pass.

## Remaining Work

- Decide whether production CI should track tests again. Keeping tests ignored means a clean checkout cannot run `npm test`.
- Add runtime API integration tests for auth, uploads, payments, admin RBAC, doctor RBAC, and consent-gated AI.
