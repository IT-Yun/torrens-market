import { db, type Report } from '@/lib/db';
import { H1, Table, Badge, Btn, Empty } from '@/components/ui';
import { ago, when } from '@/lib/format';
import { resolveReport, setListingStatus, setBanned } from '@/lib/actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Reports({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'open' } = await searchParams;
  let query = db.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
  query = view === 'open' ? query.is('resolved_at', null) : query.not('resolved_at', 'is', null);
  const { data } = await query;
  const rows = (data ?? []) as Report[];
  const lids = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))] as string[];
  const uids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean))] as string[];
  const { data: listings } = lids.length ? await db.from('listings').select('id, title, status').in('id', lids) : { data: [] };
  const { data: users } = uids.length ? await db.from('profiles').select('id, display_name, banned').in('id', uids) : { data: [] };
  const L = (id: string | null) => listings?.find((l) => l.id === id);
  const U = (id: string | null) => users?.find((u) => u.id === id);
  return (
    <>
      <H1 sub="Three distinct reports auto-hide a listing; you decide the rest here">Reports</H1>
      <div className="mb-4 flex gap-2">
        {['open', 'resolved'].map((v) => (
          <Link key={v} href={`/reports?view=${v}`} className={`rounded-full px-3 py-1 text-xs font-medium ${v === view ? 'bg-teal-600 text-white' : 'border border-stone-300 bg-white text-stone-600'}`}>{v}</Link>
        ))}
      </div>
      {rows.length === 0 ? <Empty>{view === 'open' ? 'Queue is empty 🎉' : 'Nothing resolved yet.'}</Empty> : (
        <Table head={['When', 'Reason', 'Listing', 'Reported user', 'Reporter', view === 'open' ? 'Actions' : 'Resolution']}>
          {rows.map((r) => {
            const l = L(r.listing_id), ru = U(r.reported_user_id);
            return (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3 text-xs" title={when(r.created_at)}>{ago(r.created_at)}</td>
                <td className="px-4 py-3"><Badge tone={r.reason === 'scam' ? 'red' : 'amber'}>{r.reason}</Badge>{r.detail && <div className="mt-1 max-w-xs text-xs text-stone-600">{r.detail}</div>}</td>
                <td className="px-4 py-3">{l ? <><div>{l.title}</div><Badge tone={l.status === 'active' ? 'green' : 'stone'}>{l.status}</Badge></> : <span className="text-stone-400">—</span>}</td>
                <td className="px-4 py-3">{ru ? <>{ru.display_name}{ru.banned && <> <Badge tone="red">banned</Badge></>}</> : '—'}</td>
                <td className="px-4 py-3 text-xs">{U(r.reporter_id)?.display_name ?? '—'}</td>
                <td className="px-4 py-3">
                  {view === 'open' ? (
                    <div className="flex flex-wrap gap-1.5">
                      {l && l.status === 'active' && <form action={setListingStatus.bind(null, l.id, 'deleted', `report ${r.id}`)}><Btn tone="red">Hide listing</Btn></form>}
                      {ru && !ru.banned && <form action={setBanned.bind(null, ru.id, true, `report ${r.id}`)}><Btn tone="red">Ban user</Btn></form>}
                      <form action={resolveReport.bind(null, r.id, 'actioned', undefined)}><Btn tone="teal">Mark actioned</Btn></form>
                      <form action={resolveReport.bind(null, r.id, 'dismissed', undefined)}><Btn>Dismiss</Btn></form>
                    </div>
                  ) : <div className="text-xs"><Badge tone={r.resolution === 'actioned' ? 'teal' : 'stone'}>{r.resolution}</Badge><div className="mt-1 text-stone-500">{when(r.resolved_at)}</div></div>}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
