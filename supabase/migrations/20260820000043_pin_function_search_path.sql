-- Advisor hygiene (final pre-submission sweep, 2026-08-20): pin search_path on
-- the two trigger functions that were flagged `function_search_path_mutable`.
-- Both run as the caller (not SECURITY DEFINER), so the risk is low, but pinning
-- search_path is the documented best practice and clears the advisor warning —
-- portfolio-grade cleanliness, and it forecloses any unqualified-name resolution
-- against a caller-controlled search_path.
alter function public.enforce_name_cooldown() set search_path = public;
alter function public.guard_profile_trust_columns() set search_path = public;
