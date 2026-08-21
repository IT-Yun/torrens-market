import { supabase } from './supabase';
import type { ListingCard } from './listings';

export async function isFavorite(userId: string, listingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  return data != null;
}

export async function toggleFavorite(
  userId: string,
  listingId: string,
  next: boolean,
): Promise<void> {
  if (next) {
    const { error } = await supabase
      .from('favorites')
      .upsert({ user_id: userId, listing_id: listingId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);
    if (error) throw error;
  }
}

export async function fetchFavorites(userId: string): Promise<ListingCard[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `created_at,
       listings (id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes,
                 listing_photos (storage_path, sort_order))`,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as { listings: ListingCard }[])
    .map((row) => row.listings)
    // Keep sold/reserved favorites visible (dimmed + stamped in the list)
    // instead of silently vanishing — only drop deleted listings.
    .filter((l) => l && l.status !== 'deleted');
}
