import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { H1, Card, Table, Badge, Btn } from '@/components/ui';
import { when, ago, aud } from '@/lib/format';
import { setBanned, deleteUser } from '@/lib/actions';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: p }, { data: au }, { data: listings }, { data: given }, { data: received }, { data: parts }, { data: reportsMade }, { data: reportsGot }, { data: favs }, { data: kws }, { data: blocks }, { data: trust }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).single(),
    db.auth.admin.getUserById(id),
    db.from('listings').select('id, title, status, price_cents, created_at, view_count').eq('seller_id', id).order('created_at', { ascending: false }),
    db.from('reviews').select('id, rating, comment, created_at, reviewee_id').eq('reviewer_id', id),
    db.from('reviews').select('id, rating, comment, created_at, reviewer_id').eq('reviewee_id', id),
    db.from('chat_participants').select('room_id').eq('user_id', id),
    db.from('reports').select('id, reason, created_at, listing_id').eq('reporter_id', id),
    db.from('reports').select('id, reason, created_at, resolved_at').eq('reported_user_id', id),
    db.from('favorites').select('listing_id').eq('user_id', id),
    db.from('keyword_alerts').select('keyword, active').eq('user_id', id),
    db.from('blocked_users').select('blocked_id, blocker_id').or(`blocker_id.eq.${id},blocked_id.eq.${id}`),
    db.from('profile_trust').select('*').eq('profile_id', id).maybeSingle(),
  ]);
  if (!p) return <H1>Member not found</H1>;
  await audit('user.view', 'user', id, null, { reviews_revealed: (received?.length ?? 0) + (given?.length ?? 0) }, 'operator opened member detail (reviewer identities visible here)');
  const u = au?.user;
  const names = new Map<string, string>();
  const ids = [...new Set([...(given ?? []).map((r) => r.reviewee_id), ...(received ?? []).map((r) => r.reviewer_id)])];
  if (ids.length) { const { data } = await db.from('profiles').select('id, display_name').in('id', ids); data?.forEach((x) => names.set(x.id, x.display_name ?? '?')); }
  return (
    <>
      <div className="mb-2 text-xs"><Link href="/members" className="text-teal-700 hover:underline">← Members</Link></div>
      <H1 sub={`${u?.email ?? '—'} · ${u?.app_metadata?.provider ?? ''} · id ${id}`}>{p.display_name || '(no name)'} {p.banned && <Badge tone="red">banned</Badge>}</H1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-sm font-semibold">Account</div>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-500">Joined</dt><dd>{when(p.created_at)}</dd>
            <dt className="text-stone-500">Last sign-in</dt><dd>{when(u?.last_sign_in_at)}</dd>
            <dt className="text-stone-500">Suburb</dt><dd>{p.suburb ?? '—'} {p.suburb_verified_at && '✓ verified'}</dd>
            <dt className="text-stone-500">Nationality / lang</dt><dd>{p.nationality ?? '—'} / {p.preferred_language ?? '—'}</dd>
            <dt className="text-stone-500">Phone verified</dt><dd>{p.is_phone_verified ? 'yes' : 'no'}</dd>
            <dt className="text-stone-500">ToS accepted</dt><dd>{when(p.tos_accepted_at)}</dd>
            <dt className="text-stone-500">Name changed</dt><dd>{when(p.display_name_changed_at)}</dd>
            <dt className="text-stone-500">Notif prefs</dt><dd className="font-mono text-[11px]">{JSON.stringify(p.notification_prefs)}</dd>
          </dl>
          <div className="mt-3 flex gap-2">
            <form action={setBanned.bind(null, id, !p.banned, 'from member detail')}><Btn tone={p.banned ? 'stone' : 'red'}>{p.banned ? 'Unban' : 'Ban'}</Btn></form>
            <form action={deleteUser.bind(null, id, 'from member detail')}><Btn tone="red">Delete account</Btn></form>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Trust & activity</div>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-500">Trust points</dt><dd>{trust?.trust_points ?? 0} ({trust?.review_count ?? 0} reviews, avg {trust?.avg_rating ?? '—'})</dd>
            <dt className="text-stone-500">Listings</dt><dd>{listings?.length ?? 0}</dd>
            <dt className="text-stone-500">Chat rooms</dt><dd>{parts?.length ?? 0}</dd>
            <dt className="text-stone-500">Favorites</dt><dd>{favs?.length ?? 0}</dd>
            <dt className="text-stone-500">Keyword alerts</dt><dd>{(kws ?? []).map((k) => k.keyword).join(', ') || '—'}</dd>
            <dt className="text-stone-500">Blocks</dt><dd>{blocks?.filter((b) => b.blocker_id === id).length ?? 0} made · {blocks?.filter((b) => b.blocked_id === id).length ?? 0} received</dd>
            <dt className="text-stone-500">Reports</dt><dd>{reportsMade?.length ?? 0} made · {reportsGot?.length ?? 0} received ({reportsGot?.filter((r) => !r.resolved_at).length ?? 0} open)</dd>
          </dl>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Reviews received <span className="text-xs font-normal text-stone-500">(identities visible to operator only — audited)</span></div>
          <ul className="mt-2 space-y-1 text-xs">{(received ?? []).map((r) => <li key={r.id}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} <span className="text-stone-500">by {names.get(r.reviewer_id)}</span> {r.comment && <>— {r.comment}</>}</li>)}{!received?.length && <li className="text-stone-400">none</li>}</ul>
          <div className="mt-3 text-sm font-semibold">Reviews given</div>
          <ul className="mt-1 space-y-1 text-xs">{(given ?? []).map((r) => <li key={r.id}>{'★'.repeat(r.rating)} <span className="text-stone-500">to {names.get(r.reviewee_id)}</span> {r.comment && <>— {r.comment}</>}</li>)}{!given?.length && <li className="text-stone-400">none</li>}</ul>
        </Card>
      </div>
      <div className="mt-6">
        <div className="mb-2 text-sm font-semibold">Listings</div>
        <Table head={['Title', 'Price', 'Status', 'Views', 'Posted']}>
          {(listings ?? []).map((l) => <tr key={l.id}><td className="px-4 py-2"><Link className="text-teal-700 hover:underline" href={`/listings/${l.id}`}>{l.title}</Link></td><td className="px-4 py-2">{aud(l.price_cents)}</td><td className="px-4 py-2"><Badge>{l.status}</Badge></td><td className="px-4 py-2 tabular-nums">{l.view_count}</td><td className="px-4 py-2 text-xs">{ago(l.created_at)}</td></tr>)}
          {!listings?.length && <tr><td className="px-4 py-3 text-xs text-stone-400" colSpan={5}>no listings</td></tr>}
        </Table>
      </div>
    </>
  );
}
