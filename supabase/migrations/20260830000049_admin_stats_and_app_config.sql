-- Admin console Phase 2 (ADR-017): (1) one RPC that returns database/table/
-- storage size stats for the local console — service role only; (2) app_config
-- kill switches + maintenance banner, read by the app on launch (app lane wires
-- the reader), writable only by the operator.

create or replace function public.admin_db_stats()
returns jsonb language sql security definer set search_path = public, storage as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', (
      select jsonb_object_agg(relname, n_live_tup)
      from pg_stat_user_tables where schemaname = 'public'
    ),
    'table_bytes', (
      select jsonb_object_agg(relname, pg_total_relation_size(relid))
      from pg_stat_user_tables where schemaname = 'public'
    ),
    'storage', (
      select coalesce(jsonb_object_agg(bucket_id, jsonb_build_object(
        'objects', cnt, 'bytes', bytes)), '{}'::jsonb)
      from (
        select bucket_id, count(*) as cnt,
               coalesce(sum((metadata->>'size')::bigint), 0) as bytes
        from storage.objects group by bucket_id
      ) s
    ),
    'auth_users', (select count(*) from auth.users),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'generated_at', now()
  );
$$;
revoke execute on function public.admin_db_stats() from anon, authenticated, public;

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy "app_config is readable by everyone" on public.app_config for select using (true);
-- no insert/update/delete policies: only the service role writes
insert into public.app_config (key, value) values
  ('maintenance_mode', 'false'::jsonb),
  ('uploads_enabled', 'true'::jsonb),
  ('min_app_version', '"1.0.0"'::jsonb),
  ('banner', '{"en": "", "ko": "", "zh": ""}'::jsonb)
on conflict (key) do nothing;
