# Integrity Audit Report

Generated: 2026-06-06T08:45:37.003Z

## Page Connectivity Map

- Authentication: /auth/welcome.html -> /auth/signup.html -> /auth/otp.html -> /auth/account-created.html -> /auth/login.html -> /app/dashboard.html
- Password reset: /auth/login.html -> /auth/forgot-password.html -> /auth/otp.html -> /auth/create-password.html -> /auth/login.html
- Patient: /app/dashboard.html -> /app/upload.html -> /app/upload-process.html -> /app/report-analysis.html -> /report/summary.html -> /report/detailed-report.html
- AI: /ai-assistant/chat-home.html -> /ai-assistant/conversation.html -> /ai-assistant/saved-conv.html -> /ai-assistant/voice-input.html
- Doctor/consultation: /consultation/find-doctor.html -> /consultation/profile.html -> /consultation/payment.html -> /consultation/appointment-confirmation.html -> /consultation/appointments.html
- Admin: /admin/login.html -> /admin/index.html -> /admin/user.html -> /admin/report.html -> /admin/feedback.html -> /admin/system-health.html
- Premium: /premium/index.html -> /premium/plans.html -> /premium/payment.html -> /premium/activated.html
- Recruitment/API: recruitment endpoints are backend-only at /api/recruitment and documented in API documentation.

## Required Reports

1. Unlinked Pages Report: None
2. Broken Links Report: None
3. Broken Routes Report: None found by static route audit.
4. Mock Data Report: None found by placeholder scan.
5. Placeholder Report: None
6. Dead Files Report: None
7. Unused API Report: Shared frontend API modules delegate to /assets/js/http.js and are retained for page-local imports.
8. Unused Backend Route Report: None found; all route modules are mounted from src/routes/index.js.
9. Orphaned Page Report: None
10. Missing Feature Report: Static audit complete; runtime feature verification depends on a configured MySQL/AMPPS database and AI/payment provider credentials.

## Gates

- Placeholder hrefs: Pass
- Broken internal links: Pass
- Empty JavaScript files: Pass