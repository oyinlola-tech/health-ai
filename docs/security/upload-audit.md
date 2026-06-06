# Upload Audit

Generated: 2026-06-06

## Result

Upload handling is centralized in `src/middlewares/upload.js` and uses a defensive local filesystem model.

## Verified

- Upload root must not be inside `public`.
- Upload storage maps known fields to `/uploads/reports`, `/uploads/avatars`, `/uploads/certificates`, `/uploads/cv`, and `/uploads/documents`.
- Filenames are generated with UUIDv7 and sanitized original names.
- MIME types and extensions are allowlisted.
- File size is bounded by `MAX_UPLOAD_BYTES`.
- PDF, PNG, JPEG, and WEBP magic bytes are checked after upload.
- Rejected files are removed.
- EICAR signature detection is present as a lightweight malware-scan guard.

## Remaining Work

- Production should integrate a real malware scanning service for uploaded documents.
- Private download/stream endpoints should be reviewed before exposing uploaded files to users.
