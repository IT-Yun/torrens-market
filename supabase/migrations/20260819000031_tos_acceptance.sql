-- Terms-of-service acceptance gate (App Store guideline 1.2 / Play UGC policy):
-- users must accept the ToS before their first listing. Timestamp is written
-- by the owner via the existing "users update own profile" RLS policy.

alter table public.profiles
  add column if not exists tos_accepted_at timestamptz;

-- Migration 029 replaced the table-level UPDATE grant with a column allow-list,
-- so a new client-writable column must be granted explicitly or the acceptance
-- write is rejected (403). tos_accepted_at is legitimately set by the owner when
-- they accept the terms; is_phone_verified stays excluded (server-only).
grant update (tos_accepted_at) on public.profiles to authenticated;
