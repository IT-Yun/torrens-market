-- Public per-listing favorite counts (Karrot card "likes" pattern).
-- favorites rows are RLS-protected (owner-only), so counts are exposed
-- through an owner-rights aggregate view: counts only, never who liked.
create or replace view public.listing_favorite_counts
with (security_invoker = off) as
select listing_id, count(*)::int as favorites_count
from public.favorites
group by listing_id;

grant select on public.listing_favorite_counts to anon, authenticated;
