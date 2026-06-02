# Security Report

## Implemented Controls

- Helmet security headers.
- CORS allow-list from environment.
- JSON/body size limits.
- Rate limiting.
- Input sanitization for request bodies, params, and query strings.
- Zod validation at route boundaries.
- JWT access tokens and rotating refresh tokens.
- httpOnly refresh cookies.
- CSRF token validation for unsafe methods.
- RBAC for Admin, Doctor, and Patient roles.
- Ownership checks for patient-owned resources.
- File upload MIME, extension, and size validation.
- Audit logging for sensitive operations.
- Secrets managed through `.env`, with `.env.example` as the public contract.

## Medical Safety

AI responses are stored and labeled as educational support. Legal policies and consent records make clear that MedExplain AI does not replace a licensed clinician.

## Remaining Deployment Duties

- Replace all example secrets before production.
- Use HTTPS on the VPS.
- Use a managed backup strategy for PostgreSQL and uploads.
- Configure SMTP credentials and Gemini API key through environment variables.
- Review local healthcare compliance obligations before processing real patient data.
