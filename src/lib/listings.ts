import * as ImagePicker from 'expo-image-picker';
export { attributeSnippet, formatPrice, timeAgo } from './format';
import { compressForUpload } from './images';
import { supabase } from './supabase';

export type FieldDef = {
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'dimensions' | 'photo';
  unit?: string;
  required?: boolean;
  label_i18n: Record<string, string>;
};

export type Category = {
  id: number;
  slug: string;
  name_i18n: Record<string, string>;
  field_template: FieldDef[];
};

export type ListingCard = {
  id: string;
  seller_id: string;
  title: string;
  price_cents: number;
  suburb: string;
  status: string;
  created_at: string;
  category_id: number;
  attributes: Record<string, unknown>;
  lat: number | null;
  lng: number | null;
  pickup_mode: string;
  payment_method?: string | null;
  bumped_at?: string | null;
  favorites_count?: number;
  flaw_note?: string | null;
  has_flaws?: boolean;
  listing_photos: { storage_path: string; sort_order: number; section?: 'main' | 'flaw' }[];
};

/** Karrot-style bump (ADR 010): server-time stamp; DB enforces 24h cooldown. */
export async function bumpListing(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('bump_listing', { p_listing_id: listingId });
  if (error) throw error;
}

export function canBump(bumpedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!bumpedAt) return true;
  return now - new Date(bumpedAt).getTime() >= 24 * 3600 * 1000;
}

/** Merge public favorite counts (owner-rights view) into listing cards. */
async function withFavoriteCounts<T extends { id: string }>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const { data } = await supabase
    .from('listing_favorite_counts')
    .select('listing_id, favorites_count')
    .in('listing_id', items.map((i) => i.id));
  const counts = new Map(
    ((data ?? []) as { listing_id: string; favorites_count: number }[]).map((r) => [
      r.listing_id,
      r.favorites_count,
    ]),
  );
  return items.map((i) => ({ ...i, favorites_count: counts.get(i.id) ?? 0 }));
}

export type ListingDetail = ListingCard & {
  description: string;
  condition: string;
  payment_method: string;
  offers_enabled: boolean;
  seller_id: string;
  view_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    suburb: string | null;
    nationality: string | null;
    is_phone_verified: boolean;
  };
};

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_i18n, field_template')
    .order('sort_order');
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function fetchListings(categoryId?: number | null): Promise<ListingCard[]> {
  let query = supabase
    .from('listings')
    .select(
      'id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes, lat, lng, pickup_mode, payment_method, bumped_at, flaw_note, has_flaws, listing_photos (storage_path, sort_order, section)',
    )
    .eq('status', 'active')
    .order('sort_ts', { ascending: false })
    .limit(50);
  if (categoryId != null) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) throw error;
  return withFavoriteCounts((data as ListingCard[]) ?? []);
}

export type SearchSort = 'recent' | 'cheap' | 'expensive';

export type SearchFilters = {
  query?: string;
  categoryId?: number | null;
  nationality?: string | null;
  verifiedOnly?: boolean;
  maxPriceCents?: number | null;
  condition?: string | null;
  sort?: SearchSort;
};

/** Active/sold counts for a profile's trading stats line. */
export async function fetchListingStats(
  userId: string,
): Promise<{ active: number; sold: number }> {
  const count = async (status: string) => {
    const { count: n } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', status);
    return n ?? 0;
  };
  const [active, sold] = await Promise.all([count('active'), count('sold')]);
  return { active, sold };
}

export async function searchListings(filters: SearchFilters): Promise<ListingCard[]> {
  let query = supabase
    .from('listings')
    .select(
      `id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes,
       listing_photos (storage_path, sort_order, section),
       profiles!listings_seller_id_fkey!inner (nationality, is_phone_verified)`,
    )
    .eq('status', 'active')
    .limit(50);

  if (filters.sort === 'cheap') query = query.order('price_cents', { ascending: true });
  else if (filters.sort === 'expensive') query = query.order('price_cents', { ascending: false });
  else query = query.order('sort_ts', { ascending: false });

  if (filters.query?.trim())
    query = query.textSearch('search_vector', filters.query.trim(), {
      type: 'websearch',
      config: 'simple',
    });
  if (filters.categoryId != null) query = query.eq('category_id', filters.categoryId);
  if (filters.nationality) query = query.eq('profiles.nationality', filters.nationality);
  if (filters.verifiedOnly) query = query.eq('profiles.is_phone_verified', true);
  if (filters.maxPriceCents != null) query = query.lte('price_cents', filters.maxPriceCents);
  if (filters.condition) query = query.eq('condition', filters.condition);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as ListingCard[]) ?? [];
}

export async function fetchListing(id: string): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      `id, title, description, price_cents, suburb, status, created_at, category_id, attributes,
       lat, lng, condition, pickup_mode, payment_method, offers_enabled, seller_id, view_count, flaw_note, has_flaws,
       listing_photos (storage_path, sort_order, section),
       profiles!listings_seller_id_fkey (display_name, avatar_url, suburb, nationality, is_phone_verified)`,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ListingDetail;
}

export function photoUrl(storagePath: string): string {
  return supabase.storage.from('listing-photos').getPublicUrl(storagePath).data.publicUrl;
}

type PhotoRow = { storage_path: string; sort_order: number; section?: 'main' | 'flaw' };

/** Gallery photos only (legacy rows without section count as main). */
export function mainPhotos<T extends PhotoRow>(photos: T[]): T[] {
  return photos.filter((p) => (p.section ?? 'main') === 'main');
}

/** Disclosed-flaw photos. */
export function flawPhotos<T extends PhotoRow>(photos: T[]): T[] {
  return photos.filter((p) => p.section === 'flaw');
}

export async function pickImages(max: number): Promise<ImagePicker.ImagePickerAsset[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsMultipleSelection: true,
    selectionLimit: max,
    quality: 0.8,
  });
  return result.canceled ? [] : result.assets;
}

/** 'granted' | 'denied' for the camera (asks on first call). */
export async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Rapid capture loop (Sean's flow): shoot → append → camera reopens
 * immediately; ends on cancel or when `max` shots are taken.
 */
export async function captureImages(
  max: number,
  onShot: (asset: ImagePicker.ImagePickerAsset, taken: number) => void,
): Promise<number> {
  let taken = 0;
  while (taken < max) {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    if (result.canceled) break;
    taken += 1;
    onShot(result.assets[0], taken);
  }
  return taken;
}

async function uploadPhoto(userId: string, asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const compressed = await compressForUpload(asset);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, arrayBuffer, { contentType: compressed.mimeType });
  if (error) throw error;
  return path;
}

export async function createListing(input: {
  sellerId: string;
  categoryId: number;
  title: string;
  description: string;
  priceCents: number;
  condition: string;
  pickupMode: string;
  paymentMethod: string;
  offersEnabled: boolean;
  suburb: string;
  lat?: number | null;
  lng?: number | null;
  attributes: Record<string, unknown>;
  photos: ImagePicker.ImagePickerAsset[];
  flawNote?: string | null;
  flawPhotos?: ImagePicker.ImagePickerAsset[];
  hasFlaws?: boolean;
}, onProgress?: (uploaded: number, total: number) => void): Promise<string> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: input.sellerId,
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      price_cents: input.priceCents,
      condition: input.condition,
      pickup_mode: input.pickupMode,
      payment_method: input.paymentMethod,
      offers_enabled: input.offersEnabled,
      suburb: input.suburb,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      attributes: input.attributes,
      flaw_note: input.flawNote?.trim() || null,
      has_flaws: input.hasFlaws ?? false,
    })
    .select('id')
    .single();
  if (error) throw error;
  const listingId = (data as { id: string }).id;

  const flaws = input.flawPhotos ?? [];
  const total = input.photos.length + flaws.length;
  for (let i = 0; i < input.photos.length; i++) {
    onProgress?.(i, total);
    const path = await uploadPhoto(input.sellerId, input.photos[i]);
    const { error: photoError } = await supabase
      .from('listing_photos')
      .insert({ listing_id: listingId, storage_path: path, sort_order: i, section: 'main' });
    if (photoError) throw photoError;
  }
  for (let i = 0; i < flaws.length; i++) {
    onProgress?.(input.photos.length + i, total);
    const path = await uploadPhoto(input.sellerId, flaws[i]);
    const { error: photoError } = await supabase
      .from('listing_photos')
      .insert({ listing_id: listingId, storage_path: path, sort_order: i, section: 'flaw' });
    if (photoError) throw photoError;
  }
  onProgress?.(total, total);
  return listingId;
}

/** Fire-and-forget view counter (definer RPC — no update rights needed). */
export function recordView(listingId: string): void {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) return; // anon EXECUTE deliberately revoked (view-pump defense)
    supabase.rpc('increment_view', { p_listing_id: listingId }).then(
      () => {},
      () => {},
    );
  });
}

/** Active listings by a seller (detail-page strip, public profile). */
export async function fetchSellerListings(
  sellerId: string,
  excludeId?: string,
): Promise<ListingCard[]> {
  let query = supabase
    .from('listings')
    .select(
      'id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes, lat, lng, pickup_mode, payment_method, bumped_at, flaw_note, has_flaws, listing_photos (storage_path, sort_order, section)',
    )
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('sort_ts', { ascending: false })
    .limit(20);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as ListingCard[]) ?? [];
}

export async function fetchMyListings(userId: string): Promise<ListingCard[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes, lat, lng, pickup_mode, payment_method, bumped_at, flaw_note, has_flaws, listing_photos (storage_path, sort_order, section)',
    )
    .eq('seller_id', userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return withFavoriteCounts((data as ListingCard[]) ?? []);
}

export async function updateListing(
  listingId: string,
  fields: {
    category_id: number;
    title: string;
    description: string;
    price_cents: number;
    condition: string;
    pickup_mode: string;
    payment_method: string;
    offers_enabled: boolean;
    suburb: string;
    attributes: Record<string, unknown>;
    flaw_note?: string | null;
    has_flaws?: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from('listings').update(fields).eq('id', listingId);
  if (error) throw error;
}

export type ChatPartner = { userId: string; name: string };

/** People the seller has chat rooms with on this listing (buyer candidates). */
export async function fetchListingChatPartners(
  listingId: string,
  sellerId: string,
): Promise<ChatPartner[]> {
  const { data } = await supabase
    .from('chat_rooms')
    .select('chat_participants (user_id, profiles (display_name))')
    .eq('listing_id', listingId);
  const rows = (data ?? []) as unknown as {
    chat_participants: { user_id: string; profiles: { display_name: string } | null }[];
  }[];
  const partners = new Map<string, string>();
  for (const room of rows) {
    for (const p of room.chat_participants) {
      if (p.user_id !== sellerId) partners.set(p.user_id, p.profiles?.display_name ?? '?');
    }
  }
  return [...partners.entries()].map(([userId, name]) => ({ userId, name }));
}

/** Mark sold with the buyer recorded (null = sold outside the app). */
export async function markListingSold(
  listingId: string,
  soldToUserId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'sold', sold_to_user_id: soldToUserId })
    .eq('id', listingId);
  if (error) throw error;
}

export async function updateListingStatus(
  listingId: string,
  status: 'active' | 'reserved' | 'sold' | 'deleted',
): Promise<void> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId);
  if (error) throw error;
}

