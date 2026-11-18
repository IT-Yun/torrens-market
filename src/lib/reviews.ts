import { supabase } from './supabase';

export type ProfileTrust = {
  profile_id: string;
  review_count: number;
  avg_rating: number;
  trust_points: number;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/** Aggregated trust stats for a profile, or null if they have no reviews yet. */
export async function fetchTrust(profileId: string): Promise<ProfileTrust | null> {
  const { data } = await supabase
    .from('profile_trust')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  return (data as ProfileTrust) ?? null;
}

export async function fetchReviews(profileId: string, limit = 20): Promise<Review[]> {
  // Definer RPC returns no reviewer identity (ADR-015 seal): direct SELECT on
  // reviews is restricted to rows you wrote yourself.
  const { data, error } = await supabase.rpc('get_profile_reviews', {
    p_profile: profileId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as Review[]) ?? [];
}

export async function hasReviewed(listingId: string, reviewerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('listing_id', listingId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  return data != null;
}

export async function submitReview(input: {
  listingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    listing_id: input.listingId,
    reviewer_id: input.reviewerId,
    reviewee_id: input.revieweeId,
    rating: input.rating,
    comment: input.comment.trim() || null,
  });
  if (error) throw error;
}
