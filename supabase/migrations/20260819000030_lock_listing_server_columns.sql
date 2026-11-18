-- SECURITY FIX (mass-assignment / OWASP API3, confirmed by attack sim round 3, 2026-08-19):
-- clients could write server-managed listing columns directly —
--   * view_count : self-inflate popularity (set 999999 on insert)
--   * bumped_at  : hand-set a future timestamp to bypass the once-a-day bump
--                  cooldown (adr-010) and squat the top of the feed.
-- Both are integrity/fairness bugs, not data leaks. Fix with a column-level
-- allow-list, same pattern as the profiles trust-column fix (migration 029):
-- revoke the table-level grant (which covers every column), then grant only
-- the columns the client legitimately writes. view_count is written solely by
-- the increment_view() RPC and bumped_at solely by bump_listing() — both are
-- SECURITY DEFINER (owned by postgres) and therefore exempt from these grants.
-- Generated columns (search_vector, sort_ts) are never writable anyway;
-- id/created_at/status_changed_at/location are server-managed.

revoke insert on public.listings from anon, authenticated;
revoke update on public.listings from anon, authenticated;

-- Columns the client sets when creating a listing (createListing()).
-- RLS WITH CHECK still enforces seller_id = auth.uid() on top of this.
grant insert (seller_id, category_id, title, description, price_cents, condition,
              pickup_mode, payment_method, suburb, lat, lng, attributes)
  on public.listings to authenticated;

-- Columns the client edits (updateListing() + updateListingStatus()).
grant update (category_id, title, description, price_cents, condition,
              pickup_mode, payment_method, suburb, attributes, status)
  on public.listings to authenticated;
