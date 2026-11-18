-- Supabase advisor CRITICAL (rls_disabled_in_public, email of 31 Aug, forwarded
-- by Sean 9/02): spatial_ref_sys is the one public table without RLS. It is
-- PostGIS's coordinate-reference catalog (extension-owned, no user data) and
-- RLS cannot be enabled on it (owner supabase_admin) — but the live check
-- showed anon/authenticated held FULL WRITE (incl. TRUNCATE): anyone with the
-- public anon key could empty it and break every distance query in the app.
-- Fix: strip all write privileges; keep SELECT (PostGIS reads it).
revoke insert, update, delete, truncate, references, trigger
  on table public.spatial_ref_sys from anon, authenticated, public;
