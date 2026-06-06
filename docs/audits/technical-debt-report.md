# Technical Debt Report

Generated: 2026-06-06

## High Priority

- Tests are ignored by Git, so CI cannot rely on a clean checkout unless tests are restored or moved to tracked verification scripts.
- Runtime route audit could not complete in this shell; server startup needs a reliable local test harness.
- Access tokens in `sessionStorage` remain an XSS-impact concern.

## Medium Priority

- Admin and doctor route-style pages exceed current backend workflow depth.
- Historical docs contain overlapping reports that should be consolidated.
- OCR confidence should feed a more visible manual-review workflow.

## Low Priority

- Add bundle-size budgets.
- Add slow-query and provider-latency dashboards.
- Expand route audit to include visual screenshots when browser tooling is installed.
