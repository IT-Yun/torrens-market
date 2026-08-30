import { db } from '@/lib/db';
import { H1, Table, Badge, Empty } from '@/components/ui';
import { when } from '@/lib/format';

export const dynamic = 'force-dynamic';
type Row = { id: number; at: string; actor: string; action: string; target_type: string; target_id: string; before: unknown; after: unknown; note: string | null };

export default async function Audit() {
  const { data } = await db.from('admin_audit_log').select('*').order('at', { ascending: false }).limit(300);
  const rows = (data ?? []) as Row[];
  return (
    <>
      <H1 sub="Every privileged action taken from this console, newest first">Audit log</H1>
      {rows.length === 0 ? <Empty>No admin actions recorded yet.</Empty> : (
        <Table head={['When', 'Action', 'Target', 'Before → After', 'Note']}>
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="px-4 py-3 text-xs whitespace-nowrap">{when(r.at)}</td>
              <td className="px-4 py-3"><Badge tone={r.action.includes('ban') || r.action.includes('delete') || r.action.includes('hide') ? 'red' : 'teal'}>{r.action}</Badge></td>
              <td className="px-4 py-3 text-xs">{r.target_type}<div className="font-mono text-[10px] text-stone-400">{r.target_id}</div></td>
              <td className="max-w-md px-4 py-3 font-mono text-[11px] text-stone-600">{JSON.stringify(r.before)} → {JSON.stringify(r.after)}</td>
              <td className="px-4 py-3 text-xs">{r.note ?? ''}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
