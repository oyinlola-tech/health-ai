create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('Admin', 'Doctor', 'Patient')),
  status text not null default 'active' check (status in ('active', 'pending', 'disabled')),
  email_verified_at timestamptz,
  password_reset_token_hash text,
  password_reset_expires_at timestamptz,
  consent_prompt_learning boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists refresh_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists doctor_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  specialty text,
  license_number text,
  credentials_status text not null default 'pending',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key,
  patient_id uuid not null references users(id),
  uploaded_by uuid not null references users(id),
  title text not null,
  file_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'analyzed', 'failed', 'archived')),
  summary text,
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists ai_interactions (
  id uuid primary key,
  user_id uuid not null references users(id),
  report_id uuid references reports(id),
  type text not null check (type in ('report_analysis', 'chat', 'feedback')),
  prompt text not null,
  response text,
  model text not null,
  feedback_rating integer,
  feedback_comment text,
  used_for_learning boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  user_id uuid not null references users(id),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  ai_interaction_id uuid references ai_interactions(id),
  created_at timestamptz not null default now()
);

create table if not exists health_history_entries (
  id uuid primary key,
  patient_id uuid not null references users(id),
  category text not null,
  title text not null,
  value text,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists appointments (
  id uuid primary key,
  patient_id uuid not null references users(id),
  doctor_id uuid references users(id),
  scheduled_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists notifications (
  id uuid primary key,
  user_id uuid not null references users(id),
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists doctor_jobs (
  id uuid primary key,
  created_by uuid not null references users(id),
  title text not null,
  description text not null,
  specialty text,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists doctor_applications (
  id uuid primary key,
  job_id uuid not null references doctor_jobs(id),
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'accepted', 'rejected')),
  cv_path text,
  created_doctor_id uuid references users(id),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists doctor_credentials (
  id uuid primary key,
  application_id uuid references doctor_applications(id) on delete cascade,
  doctor_id uuid references users(id) on delete cascade,
  file_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists medical_notes (
  id uuid primary key,
  doctor_id uuid not null references users(id),
  patient_id uuid not null references users(id),
  report_id uuid references reports(id),
  note text not null,
  recommendation text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists legal_policies (
  id uuid primary key,
  slug text not null unique,
  title text not null,
  body text not null,
  version text not null,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists legal_consents (
  id uuid primary key,
  user_id uuid not null references users(id),
  policy_slug text not null,
  policy_version text not null,
  accepted boolean not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists subscription_plans (
  id uuid primary key,
  code text not null unique,
  name text not null,
  price_cents integer not null default 0,
  currency text not null default 'USD',
  active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key,
  user_id uuid not null references users(id),
  plan_id uuid not null references subscription_plans(id),
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key,
  user_id uuid not null references users(id),
  subscription_id uuid references subscriptions(id),
  appointment_id uuid references appointments(id),
  provider text not null default 'opay',
  provider_reference text not null,
  purpose text not null check (purpose in ('premium_subscription', 'consultation', 'appointment')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'cancelled', 'refunded')),
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table if not exists payment_transactions (
  id uuid primary key,
  payment_id uuid not null references payments(id) on delete cascade,
  provider text not null default 'opay',
  provider_transaction_id text,
  status text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'NGN',
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payment_webhooks (
  id uuid primary key,
  provider text not null default 'opay',
  event_id text,
  event_type text not null,
  signature_valid boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists refunds (
  id uuid primary key,
  payment_id uuid not null references payments(id),
  provider_refund_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'NGN',
  reason text,
  status text not null default 'requested' check (status in ('requested', 'processing', 'succeeded', 'failed', 'cancelled')),
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists doctor_availability (
  id uuid primary key,
  doctor_id uuid not null references users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'available' check (status in ('available', 'booked', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists consultation_sessions (
  id uuid primary key,
  appointment_id uuid references appointments(id),
  patient_id uuid not null references users(id),
  doctor_id uuid not null references users(id),
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key,
  actor_id uuid references users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on users(role);
create unique index if not exists idx_users_email_lower on users(lower(email));
create index if not exists idx_users_deleted_at on users(deleted_at);
create index if not exists idx_users_created_at on users(created_at);
create index if not exists idx_reports_patient_id on reports(patient_id);
create index if not exists idx_reports_status on reports(status);
create index if not exists idx_reports_created_at on reports(created_at);
create index if not exists idx_ai_interactions_user_id on ai_interactions(user_id);
create index if not exists idx_ai_interactions_created_at on ai_interactions(created_at);
create index if not exists idx_chat_messages_user_id on chat_messages(user_id);
create index if not exists idx_health_history_patient_id on health_history_entries(patient_id);
create index if not exists idx_appointments_patient_id on appointments(patient_id);
create index if not exists idx_appointments_doctor_id on appointments(doctor_id);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_appointments_scheduled_at on appointments(scheduled_at);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_doctor_jobs_status on doctor_jobs(status);
create index if not exists idx_doctor_applications_job_id on doctor_applications(job_id);
create index if not exists idx_doctor_applications_status on doctor_applications(status);
create index if not exists idx_legal_consents_user_id on legal_consents(user_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_created_at on payments(created_at);
create index if not exists idx_payment_transactions_payment_id on payment_transactions(payment_id);
create index if not exists idx_payment_webhooks_processed_at on payment_webhooks(processed_at);
create index if not exists idx_refunds_payment_id on refunds(payment_id);
create index if not exists idx_doctor_availability_doctor_id on doctor_availability(doctor_id);
create index if not exists idx_doctor_availability_starts_at on doctor_availability(starts_at);
create index if not exists idx_consultation_sessions_patient_id on consultation_sessions(patient_id);
create index if not exists idx_consultation_sessions_doctor_id on consultation_sessions(doctor_id);
create index if not exists idx_consultation_sessions_status on consultation_sessions(status);
create index if not exists idx_audit_logs_actor_id on audit_logs(actor_id);
create index if not exists idx_audit_logs_action on audit_logs(action);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);
