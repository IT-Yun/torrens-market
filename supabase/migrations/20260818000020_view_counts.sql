-- Listing view counts (Bunjang social-proof pattern). Incremented via a
-- definer RPC so the counter needs no listing UPDATE rights.
alter table public.listings
  add column if not exists view_count int not null default 0;

create function public.increment_view(p_listing_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.listings set view_count = view_count + 1 where id = p_listing_id;
$$;
