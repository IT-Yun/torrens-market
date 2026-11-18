import { db, type Listing } from '@/lib/db';
import { H1, Table, Badge, Btn, Empty } from '@/components/ui';
import { aud, ago, when } from '@/lib/format';
import { setListingStatus } from '@/lib/actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const tones = { active: 'green', reserved: 'amber', sold: 'stone', deleted: 'red' } as const;

export default async function Listings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = 'all', q = '' } = await searchParams;
  let query = db.from('listings').select('id, seller_id, title, price_cents, suburb, status, created_at, category_id').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') query = query.eq('status', status);
  if (q) query = query.ilike('title', `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as Listing[];
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const { data: sellers } = sellerIds.length ? await db.from('profiles').select('id, display_name').in('id', sellerIds) : { data: [] };
  const seller = (id: string) => sellers?.find((s) => s.id === id)?.display_name ?? '—';
  return (
    <>
      <H1 sub="Hide = status deleted (reversible here) · restore = active">Listings</H1>
      <div className="mb-4 flex items-center gap-3">
        {['all', 'active', 'reserved', 'sold', 'deleted'].map((s) => (
          <Link key={s} href={`/listings?status=${s}&q=${encodeURIComponent(q)}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${s === status ? 'bg-teal-600 text-white' : 'bg-white text-stone-600 border border-stone-300'}`}>{s}</Link>
        ))}
        <form className="ml-auto flex gap-2"><input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="title" className="w-64 rounded-md border border-stone-300 px-3 py-1.5 text-sm" /><Btn tone="teal" type="submit">Search</Btn></form>
      </div>
      {rows.length === 0 ? <Empty>No listings{status !== 'all' ? ` with status ${status}` : ''}.</Empty> : (
        <Table head={['Listing', 'Price', 'Suburb', 'Seller', 'Posted', 'Status', 'Actions']}>
          {rows.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3"><div className="font-medium">{l.title}</div><div className="font-mono text-[10px] text-stone-400">{l.id}</div></td>
              <td className="px-4 py-3 tabular-nums">{aud(l.price_cents)}</td>
              <td className="px-4 py-3">{l.suburb}</td>
              <td className="px-4 py-3">{seller(l.seller_id)}</td>
              <td className="px-4 py-3 text-xs" title={when(l.created_at)}>{ago(l.created_at)}</td>
              <td className="px-4 py-3"><Badge tone={tones[l.status]}>{l.status}</Badge></td>
              <td className="px-4 py-3">
                {l.status === 'deleted'
                  ? <form action={setListingStatus.bind(null, l.id, 'active', undefined)}><Btn>Restore</Btn></form>
                  : <form action={setListingStatus.bind(null, l.id, 'deleted', undefined)}><Btn tone="red">Hide</Btn></form>}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
