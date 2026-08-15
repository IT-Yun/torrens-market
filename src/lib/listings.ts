import * as ImagePicker from 'expo-image-picker';
export { attributeSnippet, formatPrice, timeAgo } from './format';
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
  listing_photos: { storage_path: string; sort_order: number }[];
};

export type ListingDetail = ListingCard & {
  description: string;
  condition: string;
  pickup_mode: string;
  seller_id: string;
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
      'id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes, lat, lng, listing_photos (storage_path, sort_order)',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  if (categoryId != null) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as ListingCard[]) ?? [];
}

export type SearchFilters = {
  query?: string;
  categoryId?: number | null;
  nationality?: string | null;
  verifiedOnly?: boolean;
  maxPriceCents?: number | null;
};

export async function searchListings(filters: SearchFilters): Promise<ListingCard[]> {
  let query = supabase
    .from('listings')
    .select(
      `id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes,
       listing_photos (storage_path, sort_order),
       profiles!inner (nationality, is_phone_verified)`,
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters.query?.trim())
    query = query.textSearch('search_vector', filters.query.trim(), {
      type: 'websearch',
      config: 'simple',
    });
  if (filters.categoryId != null) query = query.eq('category_id', filters.categoryId);
  if (filters.nationality) query = query.eq('profiles.nationality', filters.nationality);
  if (filters.verifiedOnly) query = query.eq('profiles.is_phone_verified', true);
  if (filters.maxPriceCents != null) query = query.lte('price_cents', filters.maxPriceCents);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as ListingCard[]) ?? [];
}

export async function fetchListing(id: string): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      `id, title, description, price_cents, suburb, status, created_at, category_id, attributes,
       lat, lng, condition, pickup_mode, seller_id,
       listing_photos (storage_path, sort_order),
       profiles (display_name, avatar_url, suburb, nationality, is_phone_verified)`,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ListingDetail;
}

export function photoUrl(storagePath: string): string {
  return supabase.storage.from('listing-photos').getPublicUrl(storagePath).data.publicUrl;
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

async function uploadPhoto(userId: string, asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
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
  suburb: string;
  lat?: number | null;
  lng?: number | null;
  attributes: Record<string, unknown>;
  photos: ImagePicker.ImagePickerAsset[];
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
      suburb: input.suburb,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      attributes: input.attributes,
    })
    .select('id')
    .single();
  if (error) throw error;
  const listingId = (data as { id: string }).id;

  for (let i = 0; i < input.photos.length; i++) {
    onProgress?.(i, input.photos.length);
    const path = await uploadPhoto(input.sellerId, input.photos[i]);
    const { error: photoError } = await supabase
      .from('listing_photos')
      .insert({ listing_id: listingId, storage_path: path, sort_order: i });
    if (photoError) throw photoError;
  }
  onProgress?.(input.photos.length, input.photos.length);
  return listingId;
}

export async function fetchMyListings(userId: string): Promise<ListingCard[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, seller_id, title, price_cents, suburb, status, created_at, category_id, attributes, lat, lng, listing_photos (storage_path, sort_order)',
    )
    .eq('seller_id', userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ListingCard[]) ?? [];
}

export async function updateListingStatus(
  listingId: string,
  status: 'active' | 'reserved' | 'sold' | 'deleted',
): Promise<void> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId);
  if (error) throw error;
}

