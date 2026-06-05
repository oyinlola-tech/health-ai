alter table reports
  add column if not exists extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists extraction_started_at timestamptz,
  add column if not exists extraction_completed_at timestamptz,
  add column if not exists extraction_error text,
  add column if not exists processing_version text,
  add column if not exists medical_entities_json jsonb not null default '{}'::jsonb,
  add column if not exists lab_results_json jsonb not null default '[]'::jsonb,
  add column if not exists analysis_confidence integer
    check (analysis_confidence is null or (analysis_confidence >= 0 and analysis_confidence <= 100));

create index if not exists idx_reports_extraction_status on reports(extraction_status);
create index if not exists idx_reports_analysis_confidence on reports(analysis_confidence);
