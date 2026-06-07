# Integrity Audit Report

Generated: 2026-06-07T09:17:29.033Z

## Page Connectivity Map

- Patient: /register -> /login -> /dashboard -> /reports -> /report/:id -> /chat -> /subscription
- Doctor: /login -> /doctor -> /doctor/appointments -> /doctor/medical-reports -> /chat
- Admin: /login -> /admin -> /admin/users -> /admin/coupons -> /admin/payments -> /admin/audit-logs
- Payments: /subscription -> /checkout -> OPay -> /payment-success or /payment-failed
- Legal/support: /privacy, /terms, /consent, /data-policy, /help, /contact

## Required Reports

1. Unlinked Pages Report: Legacy .html files are retained only as server-side redirect targets.
2. Broken Links Report: None
3. Broken Routes Report: None found by static route audit.
4. Mock Data Report: None found by placeholder scan.
5. Placeholder Report: None
6. Dead Files Report: None
7. Unused API Report: Shared frontend API modules delegate to the active API client.
8. Unused Backend Route Report: Route modules are mounted from src/routes/index.js and admin coupon routes are mounted under /api/admin.
9. Orphaned Page Report: Route-style sitemap is available at /sitemap; legacy page files redirect to canonical routes.
10. Missing Feature Report: Runtime verification requires provider credentials for live Gemini and OPay calls.

## Gates

- Placeholder hrefs/content: Pass
- Direct .html navigation: Pass
- Broken internal links: Pass
- Empty JavaScript files: Pass