# Database Security Report

## Summary

The persistence layer uses UUIDv7 identifiers, MySQL pooling, JavaScript migrations, and parameterized repository calls.

## Controls

- Public IDs use UUIDv7 through `createId()`.
- Repositories use placeholders instead of interpolating user input.
- Route inputs are validated with Zod before DB operations.
- Authenticated routes enforce role and ownership checks in service/repository flows.
- Doctor application status lookup requires both email and medical license number and returns limited fields.
- Migration definitions include foreign keys where new hardening tables require them, including `application_reviews`.
- Upload file paths are generated server-side and validated against the upload root.

## Query Safety

Known dynamic SQL is limited to server-controlled fragments such as role-specific access clauses or fixed status filters. User-controlled values continue to flow through parameters.

## Data Integrity

Synthetic demo database seeding has been removed from startup. Health checks now reflect real configured services, and the app no longer inserts fake users, reports, appointments, or AI examples.
