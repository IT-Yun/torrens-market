import { db } from '@/lib/db';
import { H1, Table, Empty } from '@/components/ui';
import { ago } from '@/lib/format';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function Chats() {
  const { data: rooms } = await db.from('chat_rooms').select('id, listing_id, created_at').order('created_at', { ascending: false }).limit(200);
  const R = rooms ?? [];
  const ids = R.map((r) => r.id);
  const [{ data: parts }, { data: msgs }, { data: listings }] = await Promise.all([
    ids.length ? db.from('chat_participants').select('room_id, user_id') .in('room_id', ids) : { data: [] },
    ids.length ? db.from('messages').select('room_id, created_at').in('room_id', ids) : { data: [] },
    R.length ? db.from('listings').select('id, title').in('id', R.map((r) => r.listing_id)) : { data: [] },
  ]);
  const uids = [...new Set((parts ?? []).map((p) => p.user_id))];
  const { data: users } = uids.length ? await db.from('profiles').select('id, display_name').in('id', uids) : { data: [] };
  const name = (id: string) => users?.find((u) => u.id === id)?.display_name ?? '?';
  return (
    <>
      <H1 sub="Every conversation · open a room only for disputes/abuse (viewing is audited)">Chats</H1>
      {R.length === 0 ? <Empty>No chat rooms yet.</Empty> : (
        <Table head={['Room', 'Listing', 'Participants', 'Messages', 'Last activity']}>
          {R.map((r) => { const m = (msgs ?? []).filter((x) => x.room_id === r.id); const last = m.map((x) => x.created_at).sort().at(-1); return (
            <tr key={r.id}>
              <td className="px-4 py-2"><Link className="font-mono text-xs text-teal-700 hover:underline" href={`/chats/${r.id}`}>{r.id.slice(0, 8)}</Link></td>
              <td className="px-4 py-2"><Link className="hover:underline" href={`/listings/${r.listing_id}`}>{listings?.find((l) => l.id === r.listing_id)?.title ?? r.listing_id}</Link></td>
              <td className="px-4 py-2 text-xs">{(parts ?? []).filter((p) => p.room_id === r.id).map((p) => name(p.user_id)).join(' ↔ ')}</td>
              <td className="px-4 py-2 tabular-nums">{m.length}</td>
              <td className="px-4 py-2 text-xs">{last ? ago(last) : ago(r.created_at)}</td>
            </tr>); })}
        </Table>
      )}
    </>
  );
}
