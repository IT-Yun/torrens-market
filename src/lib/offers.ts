import { supabase } from './supabase';

export type OfferStatus = 'proposed' | 'accepted' | 'declined' | 'withdrawn';

export type Offer = {
  id: string;
  room_id: string;
  proposer_id: string;
  price_cents: number;
  status: OfferStatus;
  created_at: string;
};

/** The room's open or accepted offer (latest), or null. */
export async function fetchOffer(roomId: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('room_id', roomId)
    .in('status', ['proposed', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Offer) ?? null;
}

export async function proposeOffer(
  roomId: string,
  proposerId: string,
  priceCents: number,
): Promise<void> {
  const { error } = await supabase.from('offers').insert({
    room_id: roomId,
    proposer_id: proposerId,
    price_cents: priceCents,
  });
  if (error) throw error;
}

export async function setOfferStatus(id: string, status: OfferStatus): Promise<void> {
  const { error } = await supabase.from('offers').update({ status }).eq('id', id);
  if (error) throw error;
}
