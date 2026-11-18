import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { H1, Card, Badge } from '@/components/ui';
import { when, aud } from '@/lib/format';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function Room({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: room } = await db.from('chat_rooms').select('id, listing_id, created_at').eq('id', id).single();
  if (!room) return <H1>Room not found</H1>;
  await audit('chat.view', 'chat_room', id, null, null, 'operator opened a chat room (dispute/abuse review)');
  const [{ data: msgs }, { data: parts }, { data: offers }, { data: meetups }, { data: listing }] = await Promise.all([
    db.from('messages').select('id, sender_id, body, image_path, created_at').eq('room_id', id).order('created_at'),
    db.from('chat_participants').select('user_id, last_read_at').eq('room_id', id),
    db.from('offers').select('price_cents, status, created_at, proposer_id').eq('room_id', id).order('created_at'),
    db.from('meetups').select('scheduled_at, place, status, created_at').eq('room_id', id).order('created_at'),
    db.from('listings').select('title').eq('listing_id' in {} ? 'id' : 'id', room.listing_id).single(),
  ]);
  const uids = (parts ?? []).map((p) => p.user_id);
  const { data: users } = uids.length ? await db.from('profiles').select('id, display_name').in('id', uids) : { data: [] };
  const name = (uid: string) => users?.find((u) => u.id === uid)?.display_name ?? uid.slice(0, 8);
  return (
    <>
      <div className="mb-2 text-xs"><Link href="/chats" className="text-teal-700 hover:underline">← Chats</Link></div>
      <H1 sub={`${(parts ?? []).map((p) => name(p.user_id)).join(' ↔ ')} · listing: ${listing?.title ?? room.listing_id} · opened ${when(room.created_at)}`}>Chat room <Badge tone="amber">audited view</Badge></H1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ol className="space-y-2 text-sm">
            {(msgs ?? []).map((m) => <li key={m.id}><span className="text-xs text-stone-500">{when(m.created_at)}</span> <b>{name(m.sender_id)}:</b> {m.body}{m.image_path && <span className="text-xs text-stone-500"> [image {m.image_path}]</span>}</li>)}
            {!msgs?.length && <li className="text-xs text-stone-400">no messages</li>}
          </ol>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Offers</div>
          <ul className="mt-1 space-y-1 text-xs">{(offers ?? []).map((o, i) => <li key={i}>{aud(o.price_cents)} by {name(o.proposer_id)} — <Badge>{o.status}</Badge></li>)}{!offers?.length && <li className="text-stone-400">none</li>}</ul>
          <div className="mt-3 text-sm font-semibold">Meetups</div>
          <ul className="mt-1 space-y-1 text-xs">{(meetups ?? []).map((m, i) => <li key={i}>{when(m.scheduled_at)} · {m.place} — <Badge>{m.status}</Badge></li>)}{!meetups?.length && <li className="text-stone-400">none</li>}</ul>
        </Card>
      </div>
    </>
  );
}
