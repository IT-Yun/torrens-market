-- Anonymous reviews, Karrot-style (Sean 2026-08-20): when viewing someone's
-- profile you can read their reviews (rating + comment) but NOT who wrote them —
-- this prevents retaliation reviews. claude-24 anonymized the UI; this closes the
-- data-layer leak (reviewer identity no longer travels over the API for others).
--
-- get_profile_reviews returns reviews for a reviewee with NO reviewer identity.
-- profile_trust (a security-definer view, security_invoker=off) still computes
-- trust from all reviews, and a reviewer can still check their own reviews
-- (hasReviewed), so nothing downstream breaks.
create or replace function public.get_profile_reviews(p_profile uuid, p_limit int default 20)
returns table (id uuid, rating int, comment text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select r.id, r.rating, r.comment, r.created_at
  from public.reviews r
  where r.reviewee_id = p_profile
  order by r.created_at desc
  limit least(coalesce(p_limit, 20), 50);
$$;
grant execute on function public.get_profile_reviews(uuid, int) to anon, authenticated;

-- NOTE: the reviews SELECT policy is still "readable by everyone" here so the
-- current app doesn't break mid-flight. Once the app reads reviews via
-- get_profile_reviews(), a follow-up migration restricts direct SELECT to the
-- reviewer's own rows (reviewer_id = auth.uid()) to fully seal reviewer identity.
