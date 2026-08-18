import { supabase } from './supabase';

export type MeetupStatus = 'proposed' | 'accepted' | 'declined' | 'cancelled';

export type Meetup = {
  id: string;
  room_id: string;
  proposer_id: string;
  scheduled_at: string;
  place: string;
  status: MeetupStatus;
  created_at: string;
};

/** The room's current meetup (proposed or accepted), or the latest ended one. */
export async function fetchMeetup(roomId: string): Promise<Meetup | null> {
  const { data, error } = await supabase
    .from('meetups')
    .select('*')
    .eq('room_id', roomId)
    .in('status', ['proposed', 'accepted'])
    .maybeSingle();
  if (error) throw error;
  return (data as Meetup) ?? null;
}

export async function proposeMeetup(
  roomId: string,
  proposerId: string,
  scheduledAt: Date,
  place: string,
): Promise<void> {
  const { error } = await supabase.from('meetups').insert({
    room_id: roomId,
    proposer_id: proposerId,
    scheduled_at: scheduledAt.toISOString(),
    place: place.trim(),
  });
  if (error) throw error;
}

export async function setMeetupStatus(id: string, status: MeetupStatus): Promise<void> {
  const { error } = await supabase.from('meetups').update({ status }).eq('id', id);
  if (error) throw error;
}
