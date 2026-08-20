-- Don't pre-fill email signups with a throwaway "User a1b2c3d4" name that the
-- user then has to delete (Sean 2026-08-20). Social signups still get their real
-- name from the OAuth provider; email signups get an empty name and fill it in
-- during onboarding. display_name is NOT NULL, so use '' rather than null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
