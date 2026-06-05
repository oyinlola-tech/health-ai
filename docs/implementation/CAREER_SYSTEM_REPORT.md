# Career System Report

## Summary

The doctor career workflow is implemented as a secured recruitment path backed by MySQL and the existing admin verification pipeline.

## Frontend

- Route: `/doctor-careers`
- Lists published doctor positions from `/api/recruitment/jobs`.
- Supports specialization filtering from live job data.
- Provides application form with required CV and medical license uploads.
- Provides status lookup using email plus medical license number.
- Integrated into primary navigation, footer product links, and route handling.

## Backend

- Public job listing: `GET /api/recruitment/jobs`
- Public application submit: `POST /api/recruitment/applications`
- Public limited status lookup: `POST /api/recruitment/applications/status`
- Admin job creation and publishing remain protected by `Admin` role.
- Admin application review remains protected by `Admin` role.

## Data Integrity

- Applications are stored in `doctor_applications`.
- CV and medical license files are stored through the upload middleware under `/uploads`.
- Credential files are stored in `doctor_credentials`.
- Review decisions are stored in `application_reviews`.
- Approval reuses the secure doctor-account creation and credential-email pipeline.

## Security Controls

- CV and license uploads are required.
- Uploads use MIME allowlists, extension checks, magic-byte validation, malware signature check, size limits, and non-public storage.
- Status lookup returns limited application status fields only.
- Admin review actions are audit logged.

