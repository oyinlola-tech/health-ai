# Repository Audit

Generated: 2026-06-06

## Scope

Audited tracked source, public frontend assets, backend routes/services/repositories, migrations, docs, tests present locally, scripts, `.env.example`, and npm metadata.

## Findings

- Fixed: `scripts/` was ignored even though `package.json` calls `scripts/verify-frontend.mjs`, `scripts/integrity-audit.mjs`, and related tooling. The ignore rule was removed so operational scripts can be committed.
- Fixed: `docs/INTEGRITY_AUDIT_REPORT.md` was moved to `docs/audits/integrity-audit.md`.
- Fixed: PostgreSQL references in current docs were corrected to MySQL/AMPPS.
- Fixed: sitemap and generator tooling now use `/assets/css/app.css`, matching the frontend smoke gate.
- No tracked `tests/` files remain after the previous request; local tests still exist but are ignored by Git.
- No broken internal HTML links or placeholder `href="#"` links were found by `npm run audit:integrity`.

## Verification

- `npm run lint`: pass
- `npm test`: pass, 10 files passed, 1 skipped
- `npm run smoke:frontend`: pass, 75 HTML files and 54 JS files
- `npm run audit:integrity`: pass
- `npm audit --audit-level=high`: pass, 0 vulnerabilities

## Remaining Risk

- Runtime route audit could not be completed in this environment because local server startup commands hung at the shell level. The route audit script now uses fetch timeouts for future runs.
