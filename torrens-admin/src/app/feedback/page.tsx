import { db, type Feedback } from '@/lib/db';
import { H1, Table, Badge, Btn, Empty } from '@/components/ui';
import { ago, when } from '@/lib/format';
import { setFeedbackResolved } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function FeedbackPage() {
  const { data } = await db.from('feedback').select('*').order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as Feedback[];
  const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: users } = uids.length ? await db.from('profiles').select('id, display_name').in('id', uids) : { data: [] };
  return (
    <>
      <H1 sub="In-app 'Report a problem' submissions">Feedback</H1>
      {rows.length === 0 ? <Empty>No feedback yet.</Empty> : (
        <Table head={['When', 'Kind', 'Message', 'From', 'App', 'Status', '']}>
          {rows.map((f) => (
            <tr key={f.id} className="align-top">
              <td className="px-4 py-3 text-xs" title={when(f.created_at)}>{ago(f.created_at)}</td>
              <td className="px-4 py-3"><Badge tone={f.kind === 'bug' ? 'red' : 'teal'}>{f.kind}</Badge></td>
              <td className="max-w-md px-4 py-3 whitespace-pre-wrap">{f.message}</td>
              <td className="px-4 py-3 text-xs">{users?.find((u) => u.id === f.user_id)?.display_name ?? '—'}</td>
              <td className="px-4 py-3 text-xs">{f.app_version ?? '—'}</td>
              <td className="px-4 py-3">{f.resolved ? <Badge tone="green">resolved</Badge> : <Badge tone="amber">open</Badge>}</td>
              <td className="px-4 py-3"><form action={setFeedbackResolved.bind(null, f.id, !f.resolved)}><Btn>{f.resolved ? 'Reopen' : 'Resolve'}</Btn></form></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
