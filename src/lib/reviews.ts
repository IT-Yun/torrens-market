import { supabase } from './supabase';

export type ProfileTrust = {
  profile_id: string;
  review_count: number;
  avg_rating: number;
  trust_points: number;
};

export type Review = {
  id: string;
  listing_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { display_name: string };
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
  const { data, error } = await supabase
    .from('reviews')
    .select('id, listing_id, reviewer_id, rating, comment, created_at, profiles!reviews_reviewer_id_fkey (display_name)')
    .eq('reviewee_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Review[]) ?? [];
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
