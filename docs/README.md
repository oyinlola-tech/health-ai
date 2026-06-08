# MedExplain AI Documentation

This directory keeps project documentation organized away from the repository root. The root remains limited to the primary onboarding and agent guidance files.

## Structure

| Directory | Purpose |
| --- | --- |
| `architecture/` | System architecture, realtime architecture, cost architecture, initialization flow, and platform design notes. |
| `audits/` | Gap analysis, exploit scenarios, integration verification, and pipeline test reports. |
| `implementation/` | Feature and infrastructure implementation summaries. |
| `reports/` | Readiness, optimization, UI state, governance, polish, and cleanup reports. |
| `security/` | Security policies, threat model, payment security, database security, RAG trust, and hardening summaries. |
| `api/` | API-facing specifications such as health check behavior. |
| `decisions/` | Project decisions, licensing, and business model notes. |

## Root Documentation Policy

Only these documentation files should remain in the repository root:

- `README.md`
- `SECURITY.md`
- `AGENTS.md`
- `DESIGN.md`
- `.env.example`

Generated reports, audits, implementation notes, planning documents, migration summaries, AI-generated reports, and temporary documentation should be placed under the closest matching `docs/` category.
