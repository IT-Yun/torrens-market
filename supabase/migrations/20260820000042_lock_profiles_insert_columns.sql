-- Final pre-submission hardening (Sean 2026-08-20, "make it un-hackable from a
-- public GitHub repo"): least-privilege on profiles INSERT.
--
-- Background: UPDATE on profiles is already column-locked (029/030), so a client
-- cannot self-set banned/is_phone_verified/display_name_changed_at/trust_points
-- via UPDATE. But anon/authenticated still held a TABLE-level INSERT grant, which
-- covers every column including those sensitive ones. That path is already NOT
-- exploitable (the profile row is created by the handle_new_user SECURITY DEFINER
-- trigger at signup, so a client re-INSERT hits a PK conflict, and there is no
-- DELETE policy to clear the row first) — but it is unnecessary attack surface.
--
-- The app never inserts profiles from the client (verified: no .insert/.upsert on
-- profiles anywhere in src or edge functions); every profile is created by the
-- definer trigger, which runs as the table owner and is unaffected by client
-- grants. So we revoke the client INSERT grant entirely. Nothing legitimate uses
-- it; a self-verify / self-unban INSERT can no longer even be attempted.
revoke insert on public.profiles from anon, authenticated;

-- The "users insert own profile" RLS policy is now moot for clients (no grant to
-- exercise it) and harmless to leave; the definer trigger does not depend on it.
