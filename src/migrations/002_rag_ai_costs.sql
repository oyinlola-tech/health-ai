create extension if not exists vector;

create table if not exists medical_documents (
  id uuid primary key,
  source text not null check (source in ('medlineplus', 'nih', 'cdc', 'who')),
  title text not null,
  url text not null unique,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists medical_chunks (
  id uuid primary key,
  document_id uuid not null references medical_documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(768) not null,
  source text not null check (source in ('medlineplus', 'nih', 'cdc', 'who')),
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_usage_logs (
  id uuid primary key,
  user_id uuid references users(id) on delete set null,
  endpoint text not null,
  tokens_used integer not null check (tokens_used >= 0),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  response_tokens integer not null default 0 check (response_tokens >= 0),
  cost_estimate numeric(12, 6) not null default 0 check (cost_estimate >= 0),
  model_used text not null,
  cache_hit boolean not null default false,
  blocked_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_medical_documents_source on medical_documents(source);
create index if not exists idx_medical_documents_created_at on medical_documents(created_at);
create index if not exists idx_medical_chunks_document_id on medical_chunks(document_id);
create index if not exists idx_medical_chunks_source on medical_chunks(source);
create index if not exists idx_medical_chunks_embedding on medical_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_ai_usage_logs_user_id on ai_usage_logs(user_id);
create index if not exists idx_ai_usage_logs_endpoint on ai_usage_logs(endpoint);
create index if not exists idx_ai_usage_logs_model_used on ai_usage_logs(model_used);
create index if not exists idx_ai_usage_logs_created_at on ai_usage_logs(created_at);
