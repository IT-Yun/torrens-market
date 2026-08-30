-- Reports queue state for the local admin console (ADR-017): an operator
-- resolves or dismisses each report; unresolved = open queue.
alter table public.reports
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution text check (resolution in ('actioned', 'dismissed')),
  add column if not exists resolution_note text;
create index if not exists reports_open_idx on public.reports (created_at desc) where resolved_at is null;
