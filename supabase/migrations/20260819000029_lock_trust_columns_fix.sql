-- Corrects migration 028, which did not actually block the mass-assignment:
--   1. A table-level GRANT UPDATE covers every column; a column-level REVOKE
--      does not subtract from it. Must revoke the table-level UPDATE, then
--      grant UPDATE only on the client-editable columns.
--   2. The guard trigger was SECURITY DEFINER, so current_role resolved to the
--      function owner, never 'authenticated' — the check never fired.

-- (1) Column-level UPDATE allow-list. is_phone_verified is deliberately excluded
--     (server-only, set by the adr-013 Twilio flow via a definer RPC).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, suburb, nationality, preferred_language,
              location, suburb_verified_at)
  on public.profiles to authenticated;

-- (2) Fix the backstop trigger: NOT security definer, so current_user reflects
--     the caller. Client roles cannot change is_phone_verified even if a future
--     migration mis-grants the column; SECURITY DEFINER server code (owned by
--     postgres) is exempt because current_user is then the owner.
create or replace function public.guard_profile_trust_columns()
returns trigger
language plpgsql
as $$
begin
  if new.is_phone_verified is distinct from old.is_phone_verified
     and current_user in ('anon', 'authenticated') then
    raise exception 'is_phone_verified is server-managed and cannot be set by clients';
  end if;
  return new;
end;
$$;
