import { supabase } from './supabase';

export type ReportReason = 'spam' | 'scam' | 'inappropriate' | 'other';

export async function reportListing(
  reporterId: string,
  listingId: string,
  reportedUserId: string,
  reason: ReportReason,
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    listing_id: listingId,
    reported_user_id: reportedUserId,
    reason,
  });
  if (error) throw error;
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_users')
    .upsert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function fetchBlockedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', userId);
  return new Set(((data ?? []) as { blocked_id: string }[]).map((row) => row.blocked_id));
}
