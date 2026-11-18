-- Admin audit log (ADR-017 local admin console). Every privileged action the
-- operator takes from the console is recorded here — who/what/when and the
-- before→after snapshot — via the service role only. Nothing client-facing.
create table if not exists public.admin_audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null default 'local-operator',
  action text not null,                 -- e.g. 'user.ban', 'listing.hide', 'report.resolve'
  target_type text not null,            -- 'user' | 'listing' | 'report' | 'config'
  target_id text not null,
  before jsonb,
  after jsonb,
  note text
);
alter table public.admin_audit_log enable row level security;
-- no policies: only the service role (bypasses RLS) can read/write
revoke all on public.admin_audit_log from anon, authenticated, public;
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);
