# Database Schema

The PostgreSQL schema uses UUID primary keys, app-generated UUID v7 values, foreign keys, indexes, timestamps, and soft deletes where appropriate.

Core tables:

- `users`
- `refresh_tokens`
- `audit_logs`
- `reports`
- `ai_interactions`
- `chat_messages`
- `health_history_entries`
- `appointments`
- `notifications`
- `doctor_profiles`
- `doctor_jobs`
- `doctor_applications`
- `doctor_credentials`
- `medical_notes`
- `legal_policies`
- `legal_consents`
- `subscription_plans`
- `subscriptions`

The migration file is idempotent and never drops tables automatically.
