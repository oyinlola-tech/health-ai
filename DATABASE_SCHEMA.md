# MedExplain AI - Database Schema Documentation

**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site  
**Database:** PostgreSQL 12+  
**Date:** 2026-06-02

---

## TABLE OF CONTENTS

1. [Core Tables](#core-tables)
2. [Authentication Tables](#authentication-tables)
3. [Doctor Recruitment Tables](#doctor-recruitment-tables)
4. [Reports & Analysis Tables](#reports--analysis-tables)
5. [Appointment Tables](#appointment-tables)
6. [Health & Medical Tables](#health--medical-tables)
7. [Notification Tables](#notification-tables)
8. [Audit & Compliance Tables](#audit--compliance-tables)
9. [Legal Tables](#legal-tables)
10. [Relationships & Constraints](#relationships--constraints)
11. [Indexes](#indexes)
12. [Migration Strategy](#migration-strategy)

---

## CORE TABLES

### users
Represents all users in the system (Admin, Doctor, Patient)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Doctor', 'Patient')),
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'pending', 'disabled', 'invited')),
  email_verified_at TIMESTAMPTZ,
  password_reset_token_hash TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  consent_prompt_learning BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

**Columns**:
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (v7 for time-ordering) |
| email | TEXT | Unique email address |
| password_hash | TEXT | Bcrypt hash of password |
| first_name | TEXT | User's first name |
| last_name | TEXT | User's last name |
| role | TEXT | One of: Admin, Doctor, Patient |
| status | TEXT | Account status |
| email_verified_at | TIMESTAMPTZ | When email was verified (NULL = unverified) |
| password_reset_token_hash | TEXT | Hash of reset token (NULL = no reset requested) |
| password_reset_expires_at | TIMESTAMPTZ | When reset token expires |
| consent_prompt_learning | BOOLEAN | User's AI learning consent |
| metadata | JSONB | Flexible data store (profile pic, bio, etc) |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |
| deleted_at | TIMESTAMPTZ | Soft delete timestamp (NULL = active) |

**Indexes**:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

---

## AUTHENTICATION TABLES

### refresh_tokens
Stores refresh tokens for session management

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Purpose**: Manage long-lived refresh tokens for JWT session continuity
**Cleanup**: Delete when revoked_at is set or expires_at passes

**Indexes**:
```sql
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
```

---

## DOCTOR RECRUITMENT TABLES

### doctor_profiles
Extended information for doctor users

```sql
CREATE TABLE doctor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT,
  license_number TEXT UNIQUE,
  credentials_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (credentials_status IN ('pending', 'verified', 'rejected', 'expired')),
  bio TEXT,
  years_of_experience INTEGER,
  hospital_affiliation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Status Flow**: pending → verified → active (or rejected)

### recruitment_jobs
Job postings created by admins for doctor recruitment

```sql
CREATE TABLE recruitment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  specialties TEXT[] NOT NULL,
  requirements TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  created_by UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### job_applications
Doctor applications for job postings

```sql
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES recruitment_jobs(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
  resume_url TEXT,
  certificates_urls TEXT[],
  cover_letter TEXT,
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## REPORTS & ANALYSIS TABLES

### reports
Medical reports uploaded by patients

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'analyzed', 'failed', 'archived')),
  summary TEXT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### ai_interactions
Records of AI analysis and chat interactions

```sql
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  report_id UUID REFERENCES reports(id),
  type TEXT NOT NULL CHECK (type IN ('report_analysis', 'chat', 'feedback')),
  prompt TEXT NOT NULL,
  response TEXT,
  model TEXT NOT NULL,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,
  used_for_learning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### chat_messages
Individual messages in AI conversations

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  ai_interaction_id UUID REFERENCES ai_interactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## APPOINTMENT TABLES

### appointments
Scheduled appointments between patients and doctors

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id),
  doctor_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### doctor_availability
Doctor working hours and availability

```sql
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## HEALTH & MEDICAL TABLES

### health_history_entries
Patient's medical history and health conditions

```sql
CREATE TABLE health_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  value TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

**Categories**: allergies, medications, conditions, surgeries, immunizations, etc

---

## NOTIFICATION TABLES

### notifications
System notifications for users

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### notification_preferences
User's notification settings

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  appointment_reminders BOOLEAN NOT NULL DEFAULT true,
  analysis_ready_notifications BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## AUDIT & COMPLIANCE TABLES

### audit_logs
Complete audit trail of all system actions

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Actions**: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc
**Retention**: Keep for 7 years (compliance requirement)

**Indexes**:
```sql
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### system_logs
Application and system-level events

```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_level TEXT NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## LEGAL TABLES

### terms_and_conditions
Versioned terms and conditions

```sql
CREATE TABLE terms_and_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### privacy_policy
Versioned privacy policy

```sql
CREATE TABLE privacy_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### user_consents
Track user acceptance of legal documents

```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## RELATIONSHIPS & CONSTRAINTS

### Primary Relationships
```
users (1) ──→ (Many) reports
users (1) ──→ (Many) appointments (as patient)
users (1) ──→ (Many) appointments (as doctor)
users (1) ──→ (Many) ai_interactions
users (1) ──→ (1) doctor_profiles
users (1) ──→ (Many) refresh_tokens
reports (1) ──→ (Many) ai_interactions
```

### Foreign Key Rules
```sql
-- Delete cascading
- refresh_tokens → users ON DELETE CASCADE
- doctor_profiles → users ON DELETE CASCADE
- doctor_availability → users ON DELETE CASCADE

-- No action (prevent deletion)
- reports → users (patient_id)
- appointments → users (patient_id)
- ai_interactions → users ON DELETE NO ACTION
```

---

## INDEXES

### Performance Indexes
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_status ON users(role, status);

-- Report queries
CREATE INDEX idx_reports_patient_id ON reports(patient_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Appointment lookups
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);

-- AI interaction tracking
CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_report_id ON ai_interactions(report_id);

-- Audit trail
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Full text search (if needed)
CREATE INDEX idx_reports_summary_text ON reports USING GIN(to_tsvector('english', summary));
```

---

## MIGRATION STRATEGY

### Safe Migrations
```sql
-- ✅ Safe: Adding nullable columns
ALTER TABLE users ADD COLUMN phone_number TEXT;

-- ✅ Safe: Adding columns with defaults
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ DEFAULT now();

-- ✅ Safe: Creating new tables
CREATE TABLE new_feature ( ... );

-- ❌ Unsafe: Dropping columns (destroys data)
ALTER TABLE users DROP COLUMN phone_number;

-- ❌ Unsafe: Changing column types
ALTER TABLE reports ALTER COLUMN size_bytes SET DATA TYPE VARCHAR;

-- ❌ Unsafe: Removing constraints
ALTER TABLE users DROP CONSTRAINT users_role_check;
```

### Backwards Compatibility
- Always use `IF NOT EXISTS` for new schema objects
- Use `IF EXISTS` for drops
- Never drop columns, mark as deprecated instead
- Create views for backwards compatibility with renamed columns

---

## BACKUP & RECOVERY

### Backup Strategy
```bash
# Daily backups
pg_dump medexplain_ai > backup_$(date +%Y%m%d).sql

# Weekly full backups
pg_dump -F c medexplain_ai > backup_week_$(date +%Y%m%d).dump

# Test recovery regularly
pg_restore -d test_db backup_$(date +%Y%m%d).dump
```

### Data Retention
```
Production: 7 years (compliance requirement)
Backups: 3 years
Logs: 1 year
Audit Trail: Permanent (compliance)
```

---

## MONITORING

### Critical Queries to Monitor
```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

## MAINTENANCE

### Regular Maintenance
```bash
# Vacuum (reclaim space)
VACUUM ANALYZE;

# Update statistics
ANALYZE;

# Reindex tables
REINDEX TABLE users;

# Check for corruption
REINDEX INDEX CONCURRENTLY idx_users_email;
```

---

**Last Updated:** 2026-06-02  
**Author:** Oluwayemi Oyinlola Michael  
**Portfolio:** https://oyinlola.site
