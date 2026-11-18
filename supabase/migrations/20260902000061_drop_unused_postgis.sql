-- Approved by Sean 2026-09-02 08:21 (Telegram "응") after live proof that a
-- holder of the public anon key can INSERT/UPDATE/DELETE spatial_ref_sys —
-- a storage-exhaustion vector on the 500 MB free tier.
-- Fix Supabase CRITICAL advisor "rls_disabled_in_public" (2026-08-31 email).
-- The only offending table is PostGIS's spatial_ref_sys, owned by
-- supabase_admin: we can neither enable RLS on it nor revoke its PUBLIC grants
-- (both attempted 2026-09-02). PostGIS itself is unused — both geography
-- columns are 100% NULL, distances are computed on-device from lat/lng
-- (ADR-006), and nothing in our code calls an ST_* function. Dropping the
-- extension removes spatial_ref_sys and clears the finding permanently.
-- Reversible later with: create extension postgis;  (+ re-add columns)
drop index if exists public.listings_location_idx;
alter table public.listings drop column if exists location;
alter table public.profiles drop column if exists location;
drop extension if exists postgis;
