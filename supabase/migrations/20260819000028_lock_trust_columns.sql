-- SECURITY FIX (mass-assignment / OWASP API3, confirmed by attack sim 2026-08-19):
-- any authenticated user could PATCH their own profile row to set
-- is_phone_verified = true, forging the trust badge that is our primary
-- scam deterrent. The badge must only ever be set server-side (the future
-- Twilio Verify flow, adr-013, via a SECURITY DEFINER RPC).
--
-- Fix: remove UPDATE privilege on the is_phone_verified column from client
-- roles. PostgREST enforces column-level grants, so a PATCH touching this
-- column is rejected; PATCHes on the legitimately-editable columns
-- (display_name, avatar_url, suburb, nationality, preferred_language,
-- location, suburb_verified_at) still work unchanged.
revoke update (is_phone_verified) on public.profiles from anon, authenticated;

-- Belt-and-suspenders: a trigger that hard-blocks any client-role change to
-- is_phone_verified even if a future migration accidentally re-grants the
-- column. SECURITY DEFINER server code runs as the table owner and is exempt.
create or replace function public.guard_profile_trust_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_phone_verified is distinct from old.is_phone_verified
     and current_role in ('anon', 'authenticated') then
    raise exception 'is_phone_verified is server-managed and cannot be set by clients';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_profile_trust_columns() from public, anon, authenticated;

drop trigger if exists guard_profile_trust_columns on public.profiles;
create trigger guard_profile_trust_columns
  before update on public.profiles
  for each row execute function public.guard_profile_trust_columns();

-- NOTE (design finding, tracked in wiki/spec-security-hardening.md): suburb_verified_at
-- is currently written by the client during onboarding based on an on-device
-- suburb match. Because exact GPS never reaches the server (adr-006), the server
-- cannot independently verify it. Left client-writable for now; product decision
-- pending on whether to keep it as a soft signal or build real server-side proof.
