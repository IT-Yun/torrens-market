import { db } from '@/lib/db';
import { H1, Card, Badge, Btn, Table } from '@/components/ui';
import { when, ago, aud } from '@/lib/format';
import { setListingStatus } from '@/lib/actions';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: l } = await db.from('listings').select('*').eq('id', id).single();
  if (!l) return <H1>Listing not found</H1>;
  const [{ data: seller }, { data: photos }, { data: favs }, { data: rooms }, { data: reports }, { data: cat }] = await Promise.all([
    db.from('profiles').select('id, display_name, banned').eq('id', l.seller_id).single(),
    db.from('listing_photos').select('storage_path, sort_order').eq('listing_id', id).order('sort_order'),
    db.from('favorites').select('user_id').eq('listing_id', id),
    db.from('chat_rooms').select('id, created_at').eq('listing_id', id),
    db.from('reports').select('id, reason, detail, created_at, resolved_at, resolution').eq('listing_id', id),
    db.from('categories').select('slug').eq('id', l.category_id).single(),
  ]);
  const roomIds = (rooms ?? []).map((r) => r.id);
  const [{ data: offers }, { data: meetups }, { data: msgCount }] = await Promise.all([
    roomIds.length ? db.from('offers').select('room_id, price_cents, status, created_at').in('room_id', roomIds) : { data: [] },
    roomIds.length ? db.from('meetups').select('room_id, scheduled_at, place, status').in('room_id', roomIds) : { data: [] },
    roomIds.length ? db.from('messages').select('room_id').in('room_id', roomIds) : { data: [] },
  ]);
  const signed = await Promise.all((photos ?? []).map(async (p) => (await db.storage.from('listing-photos').createSignedUrl(p.storage_path, 600)).data?.signedUrl));
  return (
    <>
      <div className="mb-2 text-xs"><Link href="/listings" className="text-teal-700 hover:underline">← Listings</Link></div>
      <H1 sub={`${cat?.slug ?? l.category_id} · ${l.suburb} · posted ${when(l.created_at)} · id ${id}`}>{l.title} <Badge tone={l.status === 'active' ? 'green' : l.status === 'deleted' ? 'red' : 'stone'}>{l.status}</Badge></H1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">{signed.map((u, i) => u ? <img key={i} src={u} alt="" className="h-40 w-40 rounded-lg object-cover" /> : null)}{!signed.length && <span className="text-xs text-stone-400">no photos</span>}</div>
          <p className="mt-4 whitespace-pre-wrap text-sm">{l.description || <span className="text-stone-400">no description</span>}</p>
          <dl className="mt-4 grid grid-cols-3 gap-y-1 text-sm">
            <dt className="text-stone-500">Price</dt><dd className="col-span-2">{aud(l.price_cents)} · {l.payment_method ?? 'any'} · offers {l.offers_enabled === false ? 'off' : 'on'}</dd>
            <dt className="text-stone-500">Condition / pickup</dt><dd className="col-span-2">{l.condition} · {l.pickup_mode}</dd>
            <dt className="text-stone-500">Attributes</dt><dd className="col-span-2 font-mono text-[11px]">{JSON.stringify(l.attributes)}</dd>
            <dt className="text-stone-500">Location</dt><dd className="col-span-2">{l.lat != null ? `${l.lat}, ${l.lng} (fuzzed ~1 km)` : '—'}</dd>
            <dt className="text-stone-500">Bumped</dt><dd className="col-span-2">{when(l.bumped_at)}</dd>
          </dl>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Seller</div>
          <div className="mt-1 text-sm"><Link className="text-teal-700 hover:underline" href={`/members/${l.seller_id}`}>{seller?.display_name}</Link> {seller?.banned && <Badge tone="red">banned</Badge>}</div>
          <div className="mt-4 text-sm font-semibold">Engagement</div>
          <dl className="mt-1 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-500">Views</dt><dd className="tabular-nums">{l.view_count}</dd>
            <dt className="text-stone-500">Favorites</dt><dd className="tabular-nums">{favs?.length ?? 0}</dd>
            <dt className="text-stone-500">Chat rooms</dt><dd className="tabular-nums">{rooms?.length ?? 0} ({msgCount?.length ?? 0} msgs)</dd>
            <dt className="text-stone-500">Offers</dt><dd className="tabular-nums">{(offers ?? []).length} {offers?.length ? `(best ${aud(Math.max(...offers.map((o) => o.price_cents)))})` : ''}</dd>
            <dt className="text-stone-500">Meetups</dt><dd className="tabular-nums">{(meetups ?? []).length} {meetups?.filter((m) => m.status === 'accepted').length ? '· confirmed' : ''}</dd>
            <dt className="text-stone-500">Reports</dt><dd className="tabular-nums">{reports?.length ?? 0} ({reports?.filter((r) => !r.resolved_at).length ?? 0} open)</dd>
          </dl>
          <div className="mt-4">{l.status === 'deleted' ? <form action={setListingStatus.bind(null, id, 'active', 'from listing detail')}><Btn>Restore</Btn></form> : <form action={setListingStatus.bind(null, id, 'deleted', 'from listing detail')}><Btn tone="red">Hide listing</Btn></form>}</div>
        </Card>
      </div>
      {!!reports?.length && <div className="mt-6"><div className="mb-2 text-sm font-semibold">Reports on this listing</div><Table head={['When', 'Reason', 'Detail', 'Resolution']}>{reports.map((r) => <tr key={r.id}><td className="px-4 py-2 text-xs">{ago(r.created_at)}</td><td className="px-4 py-2"><Badge tone="amber">{r.reason}</Badge></td><td className="px-4 py-2 text-xs">{r.detail ?? ''}</td><td className="px-4 py-2 text-xs">{r.resolution ?? 'open'}</td></tr>)}</Table></div>}
      {!!rooms?.length && <div className="mt-6"><div className="mb-2 text-sm font-semibold">Chat rooms</div><ul className="text-sm">{rooms.map((r) => <li key={r.id}><Link className="text-teal-700 hover:underline" href={`/chats/${r.id}`}>{r.id}</Link> <span className="text-xs text-stone-500">{ago(r.created_at)}</span></li>)}</ul></div>}
    </>
  );
}
