alter table subscription_plans
  add column if not exists interval text not null default 'month'
    check (interval in ('free', 'month', 'year')),
  add column if not exists report_analysis_limit integer,
  add column if not exists ai_chat_limit integer,
  add column if not exists doctor_consultations_enabled boolean not null default false,
  add column if not exists health_trends_enabled boolean not null default false,
  add column if not exists priority_processing_enabled boolean not null default false,
  add column if not exists advanced_ai_enabled boolean not null default false;

alter table subscriptions
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists current_period_start timestamptz not null default date_trunc('month', now()),
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  drop constraint if exists subscriptions_status_check;

alter table subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'trialing', 'past_due', 'cancelled', 'expired'));

alter table payments
  add column if not exists plan_id uuid references subscription_plans(id),
  add column if not exists payment_attempt_id uuid,
  add column if not exists checkout_url text,
  add column if not exists provider_order_no text,
  add column if not exists verified_by uuid references users(id),
  add column if not exists failure_reason text,
  drop constraint if exists payments_status_check;

alter table payments
  add constraint payments_status_check
  check (status in ('pending', 'verified', 'failed', 'cancelled', 'refunded', 'processing'));

create table if not exists payment_attempts (
  id uuid primary key,
  user_id uuid not null references users(id),
  plan_id uuid references subscription_plans(id),
  payment_id uuid references payments(id),
  provider text not null default 'opay',
  provider_reference text not null unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'NGN',
  status text not null default 'initialized'
    check (status in ('initialized', 'redirected', 'verified', 'failed', 'cancelled', 'expired')),
  checkout_url text,
  raw_request jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_payment_attempt_id_fkey'
  ) then
    alter table payments
      add constraint payments_payment_attempt_id_fkey
      foreign key (payment_attempt_id) references payment_attempts(id);
  end if;
end $$;

create table if not exists entitlements (
  id uuid primary key,
  user_id uuid not null references users(id),
  subscription_id uuid references subscriptions(id),
  feature text not null,
  enabled boolean not null default true,
  limit_value integer,
  period_start timestamptz,
  period_end timestamptz,
  source text not null default 'subscription',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature, source)
);

create table if not exists billing_events (
  id uuid primary key,
  user_id uuid references users(id),
  subscription_id uuid references subscriptions(id),
  payment_id uuid references payments(id),
  event_type text not null,
  provider text not null default 'opay',
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists usage_tracking (
  id uuid primary key,
  user_id uuid not null references users(id),
  feature text not null,
  period_start date not null,
  period_end date not null,
  used_count integer not null default 0 check (used_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature, period_start)
);

alter table payment_webhooks
  add column if not exists provider_reference text,
  add column if not exists signature text,
  add column if not exists replay_key text,
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists status text not null default 'received'
    check (status in ('received', 'processed', 'rejected', 'duplicate'));

create unique index if not exists idx_payment_webhooks_replay_key on payment_webhooks(provider, replay_key) where replay_key is not null;
create index if not exists idx_payment_attempts_user_id on payment_attempts(user_id);
create index if not exists idx_payment_attempts_status on payment_attempts(status);
create index if not exists idx_entitlements_user_feature on entitlements(user_id, feature);
create index if not exists idx_billing_events_user_id on billing_events(user_id);
create index if not exists idx_billing_events_created_at on billing_events(created_at);
create index if not exists idx_usage_tracking_user_feature on usage_tracking(user_id, feature, period_start);

insert into subscription_plans (
  id, code, name, price_cents, currency, active, features, interval,
  report_analysis_limit, ai_chat_limit, doctor_consultations_enabled,
  health_trends_enabled, priority_processing_enabled, advanced_ai_enabled
)
values
  ('018f0000-0000-7000-8000-000000000001', 'FREE', 'Free', 0, 'NGN',
   true, '["3 report analyses per month","10 AI chat messages per month"]'::jsonb,
   'free', 3, 10, false, false, false, false),
  ('018f0000-0000-7000-8000-000000000002', 'PREMIUM_MONTHLY', 'Premium Monthly', 500000, 'NGN',
   true, '["Unlimited report analyses","Unlimited AI chat","Doctor consultations","Health trend analytics","Priority processing","Advanced AI explanations"]'::jsonb,
   'month', null, null, true, true, true, true),
  ('018f0000-0000-7000-8000-000000000003', 'PREMIUM_ANNUAL', 'Premium Annual', 5000000, 'NGN',
   true, '["Unlimited report analyses","Unlimited AI chat","Doctor consultations","Health trend analytics","Priority processing","Advanced AI explanations"]'::jsonb,
   'year', null, null, true, true, true, true)
on conflict (code) do update
set name = excluded.name,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    active = excluded.active,
    features = excluded.features,
    interval = excluded.interval,
    report_analysis_limit = excluded.report_analysis_limit,
    ai_chat_limit = excluded.ai_chat_limit,
    doctor_consultations_enabled = excluded.doctor_consultations_enabled,
    health_trends_enabled = excluded.health_trends_enabled,
    priority_processing_enabled = excluded.priority_processing_enabled,
    advanced_ai_enabled = excluded.advanced_ai_enabled;
