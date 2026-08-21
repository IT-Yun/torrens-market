-- Nickname cooldown fix (Sean's on-device report, 2026-08-21): the initial
-- onboarding save was consuming the 30-day cooldown — the profile row is
-- created empty by handle_new_user, so the user's FIRST "Set up your profile"
-- save already looked like a rename and stamped display_name_changed_at,
-- locking every fresh account out of renaming for 30 days.
--
-- Rule: while the profile is not yet onboarded (old.suburb is null), setting
-- the display name neither enforces nor stamps the cooldown. The onboarding
-- save writes display_name and suburb together, so from the next update on
-- old.suburb is set and the cooldown applies normally.
create or replace function public.enforce_name_cooldown()
returns trigger language plpgsql set search_path = public as $$  -- not definer: current_user = the caller
begin
  if new.display_name is distinct from old.display_name
     and old.suburb is not null then
    if current_user in ('anon', 'authenticated')
       and old.display_name_changed_at is not null
       and old.display_name_changed_at > now() - interval '30 days' then
      raise exception 'Nickname can only be changed once every 30 days.';
    end if;
    new.display_name_changed_at := now();
  end if;
  return new;
end $$;

-- One-time repair: every existing stamp came from an onboarding save
-- (pre-launch, test accounts only), so reset them all.
update public.profiles set display_name_changed_at = null;
