'use server';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { audit } from './audit';

export async function setBanned(userId: string, banned: boolean, note?: string) {
  const { data: before } = await db.from('profiles').select('id, display_name, banned').eq('id', userId).single();
  const { data: after, error } = await db.from('profiles').update({ banned }).eq('id', userId).select('id, display_name, banned').single();
  if (error) throw new Error(error.message);
  await audit(banned ? 'user.ban' : 'user.unban', 'user', userId, before, after, note);
  revalidatePath('/members');
}

export async function deleteUser(userId: string, note?: string) {
  const { data: before } = await db.from('profiles').select('*').eq('id', userId).single();
  // storage objects referenced by this user's listings + avatar
  const { data: lids } = await db.from('listings').select('id').eq('seller_id', userId);
  const ids = (lids ?? []).map((l) => l.id);
  if (ids.length) {
    const { data: photos } = await db.from('listing_photos').select('storage_path').in('listing_id', ids);
    const paths = (photos ?? []).map((p) => p.storage_path);
    if (paths.length) await db.storage.from('listing-photos').remove(paths);
  }
  const av = (before?.avatar_url ?? '').split('/avatars/')[1];
  if (av) await db.storage.from('avatars').remove([av.split('?')[0]]);
  const { error } = await db.auth.admin.deleteUser(userId); // cascades profiles → listings/reviews/chats
  if (error) throw new Error(error.message);
  await audit('user.delete', 'user', userId, before, null, note);
  revalidatePath('/members');
}

export async function setListingStatus(listingId: string, status: 'active' | 'deleted', note?: string) {
  const { data: before } = await db.from('listings').select('id, title, status').eq('id', listingId).single();
  const { data: after, error } = await db.from('listings').update({ status }).eq('id', listingId).select('id, title, status').single();
  if (error) throw new Error(error.message);
  await audit(status === 'deleted' ? 'listing.hide' : 'listing.restore', 'listing', listingId, before, after, note);
  revalidatePath('/listings'); revalidatePath('/reports');
}

export async function resolveReport(reportId: string, resolution: 'actioned' | 'dismissed', note?: string) {
  const { data: before } = await db.from('reports').select('*').eq('id', reportId).single();
  const { data: after, error } = await db.from('reports')
    .update({ resolved_at: new Date().toISOString(), resolution, resolution_note: note ?? null })
    .eq('id', reportId).select('*').single();
  if (error) throw new Error(error.message);
  await audit(`report.${resolution}`, 'report', reportId, before, after, note);
  revalidatePath('/reports');
}

export async function setFeedbackResolved(id: string, resolved: boolean) {
  const { error } = await db.from('feedback').update({ resolved }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit(resolved ? 'feedback.resolve' : 'feedback.reopen', 'feedback', id, null, { resolved });
  revalidatePath('/feedback');
}
