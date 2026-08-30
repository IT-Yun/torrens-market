import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { H1, Table, Empty, Badge } from '@/components/ui';
import { ago } from '@/lib/format';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function Reviews() {
  const { data } = await db.from('reviews').select('id, rating, comment, created_at, reviewer_id, reviewee_id, listing_id').order('created_at', { ascending: false }).limit(300);
  const R = data ?? [];
  await audit('reviews.list', 'reviews', 'all', null, { count: R.length }, 'operator listed reviews with reviewer identities');
  const uids = [...new Set(R.flatMap((r) => [r.reviewer_id, r.reviewee_id]))];
  const { data: users } = uids.length ? await db.from('profiles').select('id, display_name').in('id', uids) : { data: [] };
  const name = (id: string) => users?.find((u) => u.id === id)?.display_name ?? '?';
  const dist = [5, 4, 3, 2, 1].map((s) => [s, R.filter((r) => r.rating === s).length] as const);
  return (
    <>
      <H1 sub="Anonymous to users (ADR-015); identities visible here and every list view is audited">Reviews</H1>
      <div className="mb-4 flex gap-3 text-xs">{dist.map(([s, n]) => <Badge key={s} tone={s >= 4 ? 'green' : s <= 2 ? 'red' : 'stone'}>{s}★ {n}</Badge>)}</div>
      {R.length === 0 ? <Empty>No reviews yet.</Empty> : (
        <Table head={['When', 'Rating', 'Reviewer → Reviewee', 'Comment']}>
          {R.map((r) => <tr key={r.id}><td className="px-4 py-2 text-xs">{ago(r.created_at)}</td><td className="px-4 py-2">{'★'.repeat(r.rating)}</td><td className="px-4 py-2 text-xs"><Link className="text-teal-700 hover:underline" href={`/members/${r.reviewer_id}`}>{name(r.reviewer_id)}</Link> → <Link className="text-teal-700 hover:underline" href={`/members/${r.reviewee_id}`}>{name(r.reviewee_id)}</Link></td><td className="px-4 py-2 text-sm">{r.comment ?? ''}</td></tr>)}
        </Table>
      )}
    </>
  );
}
