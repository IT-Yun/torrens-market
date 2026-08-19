-- Security hardening pass (Supabase advisor findings, 2026-08-19).
-- Empirical check first: all RLS-protected tables return [] to anon —
-- no user data was exposed. This migration clears the advisor warnings
-- and tightens the blast radius of SECURITY DEFINER functions.

-- 1) Trigger-only functions must not be callable by clients at all.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_keyword_alerts() from public, anon, authenticated;
revoke execute on function public.notify_chat_message() from public, anon, authenticated;
revoke execute on function public.notify_meetup_change() from public, anon, authenticated;
revoke execute on function public.notify_offer_change() from public, anon, authenticated;
revoke execute on function public.notify_price_drop() from public, anon, authenticated;
revoke execute on function public.auto_hide_reported_listing() from public, anon, authenticated;
revoke execute on function public.track_status_change() from public, anon, authenticated;

-- 2) RPCs the app calls: signed-in users only (never anon).
revoke execute on function public.start_chat(uuid) from public, anon;
revoke execute on function public.bump_listing(uuid) from public, anon;
revoke execute on function public.increment_view(uuid) from public, anon;
revoke execute on function public.mark_read(uuid) from public, anon;
revoke execute on function public.is_room_participant(uuid) from public, anon;
grant execute on function public.start_chat(uuid) to authenticated;
grant execute on function public.bump_listing(uuid) to authenticated;
grant execute on function public.increment_view(uuid) to authenticated;
grant execute on function public.mark_read(uuid) to authenticated;
grant execute on function public.is_room_participant(uuid) to authenticated;

-- 3) Pin search_path on the two functions the advisor flagged as mutable.
alter function public.track_status_change() set search_path = public;
alter function public.mark_read(uuid) set search_path = public;

-- 4) spatial_ref_sys (PostGIS EPSG catalog — public constants, no user data).
--    We don't own it, so RLS can't be enabled; revoke client reads instead.
--    Wrapped: ignore if permissions prevent it on this plan.
do $$
begin
  revoke select on table public.spatial_ref_sys from anon, authenticated;
exception when insufficient_privilege then
  raise notice 'spatial_ref_sys revoke skipped (not owner) — harmless: table holds only EPSG constants';
end $$;

-- 5) listing_favorite_counts / profile_trust stay SECURITY DEFINER by design:
--    they expose only safe aggregates (favorite counts, trust points) that the
--    UI shows publicly, while the underlying rows remain RLS-protected.
--    Documented as accepted in docs/adr/008-trust-tiers.md.
