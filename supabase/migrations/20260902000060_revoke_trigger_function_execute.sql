-- Advisor hygiene (security lint: *_security_definer_function_executable),
-- flagged by the admin console's new /security page on 2026-09-02.
-- The notif_on_* functions are SECURITY DEFINER trigger functions and were
-- left executable by client roles. PostgreSQL refuses a direct call to a
-- PL/pgSQL trigger function ("trigger functions can only be called as
-- triggers"), so this is defense in depth rather than a live hole — but it
-- matches the pattern already used for alert_*/guard_*/validate_* (migs
-- 038/046/056) and clears the lint. enforce_* are caller-rights triggers;
-- revoked for the same consistency.
revoke execute on function public.notif_on_message() from anon, authenticated, public;
revoke execute on function public.notif_on_offer() from anon, authenticated, public;
revoke execute on function public.notif_on_meetup() from anon, authenticated, public;
revoke execute on function public.notif_on_review() from anon, authenticated, public;
revoke execute on function public.notif_on_favorite() from anon, authenticated, public;
revoke execute on function public.enforce_bump_cooldown() from anon, authenticated, public;
revoke execute on function public.enforce_name_cooldown() from anon, authenticated, public;
