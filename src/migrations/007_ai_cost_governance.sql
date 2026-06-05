alter table ai_usage_logs
  add column if not exists feature_type text,
  add column if not exists request_id text,
  add column if not exists input_tokens integer not null default 0 check (input_tokens >= 0),
  add column if not exists output_tokens integer not null default 0 check (output_tokens >= 0),
  add column if not exists estimated_cost numeric(12, 6) not null default 0 check (estimated_cost >= 0),
  add column if not exists cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  add column if not exists cost_ngn numeric(14, 2),
  add column if not exists response_time_ms integer not null default 0 check (response_time_ms >= 0),
  add column if not exists status text not null default 'completed' check (status in ('completed', 'cached', 'blocked', 'failed')),
  add column if not exists prompt_hash text,
  add column if not exists safety_flags jsonb not null default '[]'::jsonb;

update ai_usage_logs
set input_tokens = prompt_tokens,
    output_tokens = response_tokens,
    estimated_cost = cost_estimate,
    cost_usd = cost_estimate / 100,
    status = case
      when blocked_reason is not null then 'blocked'
      when cache_hit then 'cached'
      else 'completed'
    end
where input_tokens = 0
  and output_tokens = 0
  and estimated_cost = 0;

create unique index if not exists idx_ai_usage_logs_request_id on ai_usage_logs(request_id) where request_id is not null;
create index if not exists idx_ai_usage_logs_feature_type on ai_usage_logs(feature_type);
create index if not exists idx_ai_usage_logs_status on ai_usage_logs(status);
create index if not exists idx_ai_usage_logs_prompt_hash on ai_usage_logs(prompt_hash);

create table if not exists user_ai_quotas (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  plan_code text not null default 'FREE',
  monthly_cost_limit_usd numeric(12, 6) not null default 0 check (monthly_cost_limit_usd >= 0),
  monthly_token_limit integer check (monthly_token_limit is null or monthly_token_limit >= 0),
  daily_request_limit integer check (daily_request_limit is null or daily_request_limit >= 0),
  burst_per_minute integer check (burst_per_minute is null or burst_per_minute >= 0),
  period_start date not null,
  period_end date not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start)
);

create table if not exists ai_budget_limits (
  id uuid primary key,
  scope text not null check (scope in ('system', 'feature', 'user')),
  scope_key text not null,
  monthly_cost_limit_usd numeric(12, 6) not null check (monthly_cost_limit_usd >= 0),
  emergency_throttle boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, scope_key)
);

create table if not exists ai_cache_store (
  id uuid primary key,
  cache_key text not null unique,
  prompt_hash text not null,
  feature_type text not null,
  model_used text not null,
  response_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  hits integer not null default 0 check (hits >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_hit_at timestamptz
);

create table if not exists ai_cost_summary (
  id uuid primary key,
  period_start date not null,
  period_end date not null,
  feature_type text not null,
  model_used text not null,
  requests integer not null default 0 check (requests >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  cache_hits integer not null default 0 check (cache_hits >= 0),
  blocked_requests integer not null default 0 check (blocked_requests >= 0),
  average_response_time_ms integer not null default 0 check (average_response_time_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_start, feature_type, model_used)
);

insert into ai_budget_limits (id, scope, scope_key, monthly_cost_limit_usd, emergency_throttle, metadata)
values
  ('018f0000-0000-7000-8000-00000000a701', 'system', 'global', 100.00, false, '{"source":"migration-default"}'::jsonb),
  ('018f0000-0000-7000-8000-00000000a702', 'feature', 'report_analysis', 60.00, false, '{"source":"migration-default"}'::jsonb),
  ('018f0000-0000-7000-8000-00000000a703', 'feature', 'chat_message', 25.00, false, '{"source":"migration-default"}'::jsonb),
  ('018f0000-0000-7000-8000-00000000a704', 'feature', 'follow_up_question', 10.00, false, '{"source":"migration-default"}'::jsonb),
  ('018f0000-0000-7000-8000-00000000a705', 'feature', 'doctor_assist_request', 20.00, false, '{"source":"migration-default"}'::jsonb)
on conflict (scope, scope_key) do nothing;

create index if not exists idx_user_ai_quotas_user_period on user_ai_quotas(user_id, period_start, period_end);
create index if not exists idx_ai_budget_limits_active on ai_budget_limits(scope, scope_key) where active = true;
create index if not exists idx_ai_cache_store_expires_at on ai_cache_store(expires_at);
create index if not exists idx_ai_cache_store_prompt_hash on ai_cache_store(prompt_hash);
create index if not exists idx_ai_cost_summary_period on ai_cost_summary(period_start, period_end);
