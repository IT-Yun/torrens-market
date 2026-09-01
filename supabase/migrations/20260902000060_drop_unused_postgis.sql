-- Resolve Supabase advisor CRITICAL rls_disabled_in_public permanently
-- (Sean's explicit OK, 2026-09-02 08:21 — "응" to the destructive-change ask).
--
-- spatial_ref_sys (PostGIS EPSG catalog, supabase_admin-owned) cannot be
-- RLS-enabled or write-revoked by our role (059 proved the revoke no-ops).
-- PostGIS is entirely unused here: listings.location and profiles.location are
-- 100% NULL in prod, no function/view/code references (verified 2026-09-02),
-- distance is computed on-device from fuzzed lat/lng (ADR-006).
-- Dropping the unused surface removes spatial_ref_sys itself — the advisor
-- finding and the write exposure disappear together.
drop index if exists public.listings_location_idx;
alter table public.listings drop column if exists location;
alter table public.profiles drop column if exists location;
drop extension if exists postgis;
