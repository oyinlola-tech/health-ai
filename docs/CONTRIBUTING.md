# Contributing

This is proprietary software owned by Oluwayemi Oyinlola Michael.

Authorized contributors should:

- Never commit `.env` or secrets.
- Keep API responses in the standard `{ success, data, error, meta }` shape.
- Add validation for every new route.
- Enforce RBAC and ownership before returning protected data.
- Keep migrations non-destructive by default.
- Run lint, tests, frontend smoke checks, and CSS build before handoff.
