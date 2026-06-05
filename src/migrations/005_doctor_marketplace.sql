alter table doctor_profiles
  add column if not exists specialization text,
  add column if not exists years_experience integer not null default 0 check (years_experience >= 0),
  add column if not exists verification_status text not null default 'UNVERIFIED',
  add column if not exists consultation_fee_cents integer not null default 0 check (consultation_fee_cents >= 0),
  add column if not exists accepting_patients boolean not null default false,
  add column if not exists vacation_mode boolean not null default false,
  add column if not exists rating_average numeric(3,2) not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references users(id),
  drop constraint if exists doctor_profiles_verification_status_check;

alter table doctor_profiles
  add constraint doctor_profiles_verification_status_check
  check (verification_status in ('UNVERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED'));

update doctor_profiles
set specialization = coalesce(specialization, specialty),
    verification_status = case
      when credentials_status = 'verified' then 'VERIFIED'
      when credentials_status = 'pending' then 'PENDING'
      else verification_status
    end,
    accepting_patients = case when credentials_status = 'verified' then true else accepting_patients end
where specialization is null or verification_status = 'UNVERIFIED';

alter table doctor_applications
  alter column job_id drop not null,
  add column if not exists medical_license_number text,
  add column if not exists specialization text,
  add column if not exists years_experience integer not null default 0 check (years_experience >= 0),
  add column if not exists documents_path text,
  add column if not exists rejection_reason text,
  drop constraint if exists doctor_applications_status_check;

update doctor_applications
set status = case
  when status = 'submitted' then 'PENDING'
  when status = 'reviewing' then 'PENDING'
  when status = 'accepted' then 'APPROVED'
  when status = 'rejected' then 'REJECTED'
  else upper(status)
end;

alter table doctor_applications
  alter column status set default 'PENDING',
  add constraint doctor_applications_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED'));

create table if not exists doctor_verification_logs (
  id uuid primary key,
  doctor_id uuid not null references users(id),
  actor_id uuid references users(id),
  previous_status text,
  new_status text not null check (new_status in ('UNVERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED')),
  license_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists doctors_availability (
  id uuid primary key,
  doctor_id uuid not null references users(id),
  day_of_week integer not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  slot_minutes integer not null default 30 check (slot_minutes between 10 and 240),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists doctor_unavailable_slots (
  id uuid primary key,
  doctor_id uuid not null references users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table appointments
  drop constraint if exists appointments_status_check;

update appointments
set status = case
  when status = 'requested' then 'PENDING'
  else upper(status)
end;

alter table appointments
  alter column status set default 'PENDING',
  add constraint appointments_status_check
  check (status in ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));

create unique index if not exists idx_appointments_doctor_scheduled_active
  on appointments(doctor_id, scheduled_at)
  where deleted_at is null and status in ('PENDING', 'CONFIRMED');

alter table consultation_sessions
  add column if not exists appointment_id uuid references appointments(id),
  add column if not exists room_key text unique,
  add column if not exists mode text not null default 'CHAT' check (mode in ('CHAT', 'VIDEO_READY')),
  add column if not exists scheduled_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  drop constraint if exists consultation_sessions_status_check;

update consultation_sessions
set status = upper(status);

alter table consultation_sessions
  alter column status set default 'SCHEDULED';

alter table consultation_sessions
  add constraint consultation_sessions_status_check
  check (status in ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'));

alter table chat_messages
  add column if not exists consultation_session_id uuid references consultation_sessions(id),
  add column if not exists sender_id uuid references users(id),
  add column if not exists recipient_id uuid references users(id),
  add column if not exists encrypted_content jsonb,
  add column if not exists read_at timestamptz;

create table if not exists doctor_ratings (
  id uuid primary key,
  doctor_id uuid not null references users(id),
  patient_id uuid not null references users(id),
  appointment_id uuid references appointments(id),
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (doctor_id, patient_id, appointment_id)
);

create index if not exists idx_doctor_profiles_verification_status on doctor_profiles(verification_status);
create index if not exists idx_doctors_availability_doctor_day on doctors_availability(doctor_id, day_of_week);
create index if not exists idx_doctor_unavailable_slots_doctor on doctor_unavailable_slots(doctor_id, starts_at, ends_at);
create index if not exists idx_doctor_verification_logs_doctor on doctor_verification_logs(doctor_id, created_at);
create index if not exists idx_consultation_sessions_appointment on consultation_sessions(appointment_id);
create unique index if not exists idx_consultation_sessions_appointment_unique on consultation_sessions(appointment_id) where appointment_id is not null;
create index if not exists idx_consultation_sessions_patient on consultation_sessions(patient_id);
create index if not exists idx_consultation_sessions_doctor on consultation_sessions(doctor_id);
create index if not exists idx_chat_messages_consultation on chat_messages(consultation_session_id, created_at);
create index if not exists idx_doctor_ratings_doctor on doctor_ratings(doctor_id);
