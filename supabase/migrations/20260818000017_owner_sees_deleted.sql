-- Soft-deleting was impossible: the new 'deleted' row failed the SELECT
-- policy that the UPDATE's returning visibility requires. Owners may see
-- their own deleted listings (the app filters them out of my-listings).
drop policy "active listings are readable by everyone" on public.listings;
create policy "listings readable unless deleted (owners always)"
  on public.listings for select
  using (status <> 'deleted' or auth.uid() = seller_id);
