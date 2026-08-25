-- Seal reviewer identity (ADR-015 follow-up, pulled forward by Sean's
-- 2026-08-25 "lock everything down for guests" audit).
--
-- Finding: reviews SELECT policy was `using (true)` (left in mig 041 so the
-- old app kept working), so ANY reader — including a session-less guest —
-- could read reviewer_id on every "anonymous" review via a direct table select.
--
-- Now that the app reads reviews only through get_profile_reviews() (definer,
-- returns no reviewer identity), direct SELECT is restricted to the reviewer's
-- own rows: that keeps hasReviewed() (reviewer_id = auth.uid()) working and
-- exposes nothing else. profile_trust (owner-rights view) and
-- get_profile_reviews() (security definer) are unaffected.
drop policy if exists "reviews are readable by everyone" on public.reviews;
create policy "reviewers read their own reviews"
  on public.reviews for select
  using (auth.uid() = reviewer_id);
