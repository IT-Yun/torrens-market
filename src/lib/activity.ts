import { supabase } from './supabase';

/**
 * In-app activity center (ADR-019): persistent record of things that
 * happened to the user — messages, offers, meetups, reviews, favorites.
 * Rows are written only by definer triggers; clients read their own rows
 * and flip read_at via RPCs.
 */

export type ActivityKind = 'message' | 'offer' | 'meetup' | 'review' | 'favorite' | 'system';

export type Activity = {
  id: string;
  kind: ActivityKind;
  actor_id: string | null;
  listing_id: string | null;
  room_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  actor: { display_name: string } | null;
  listing: { title: string } | null;
};

export async function fetchActivities(limit = 50): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `id, kind, actor_id, listing_id, room_id, data, created_at, read_at,
       actor:profiles!notifications_actor_id_fkey (display_name),
       listing:listings (title)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Activity[]) ?? [];
}

/** Unread activity count (RLS scopes rows to the signed-in user). */
export async function fetchUnreadActivityCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}

export async function markActivityRead(id: string): Promise<void> {
  await supabase.rpc('mark_notification_read', { p_id: id });
}

export async function markAllActivitiesRead(): Promise<void> {
  await supabase.rpc('mark_all_notifications_read');
}

/** Live INSERT subscription for the bell dot; returns cleanup. */
export function subscribeActivities(userId: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`activity-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      onInsert,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
