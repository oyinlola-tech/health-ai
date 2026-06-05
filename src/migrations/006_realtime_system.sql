create table if not exists chat_sessions (
  id uuid primary key,
  consultation_session_id uuid references consultation_sessions(id),
  appointment_id uuid references appointments(id),
  patient_id uuid not null references users(id),
  doctor_id uuid not null references users(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_chat_sessions_consultation_unique on chat_sessions(consultation_session_id) where consultation_session_id is not null;

alter table chat_messages
  add column if not exists chat_session_id uuid references chat_sessions(id);

create table if not exists notification_events (
  id uuid primary key,
  notification_id uuid references notifications(id) on delete cascade,
  user_id uuid not null references users(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  read_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists presence_logs (
  id uuid primary key,
  user_id uuid not null references users(id),
  role text not null,
  status text not null check (status in ('ONLINE', 'OFFLINE', 'AVAILABLE', 'UNAVAILABLE')),
  socket_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists message_delivery_status (
  id uuid primary key,
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references users(id),
  status text not null check (status in ('SENT', 'DELIVERED', 'READ')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists idx_chat_sessions_participants on chat_sessions(patient_id, doctor_id);
create index if not exists idx_chat_sessions_consultation on chat_sessions(consultation_session_id);
create index if not exists idx_chat_messages_chat_session on chat_messages(chat_session_id, created_at);
create index if not exists idx_notification_events_user on notification_events(user_id, created_at);
create index if not exists idx_presence_logs_user on presence_logs(user_id, created_at);
create index if not exists idx_message_delivery_status_user on message_delivery_status(user_id, status);
