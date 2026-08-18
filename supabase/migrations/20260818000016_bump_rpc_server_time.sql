-- Bump must use server time — a client clock behind the DB produced a
-- bumped_at older than newer listings' created_at (found by E2E).
create function public.bump_listing(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.listings
  set bumped_at = now()
  where id = p_listing_id and seller_id = auth.uid();
  if not found then
    raise exception 'listing not found';
  end if;
end;
$$;
