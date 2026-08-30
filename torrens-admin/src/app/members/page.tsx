import { db, type Profile } from '@/lib/db';
import { H1, Table, Badge, Btn, Empty } from '@/components/ui';
import { when, ago } from '@/lib/format';
import { setBanned, deleteUser } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  let query = db.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
  if (q) query = query.or(`display_name.ilike.%${q}%,suburb.ilike.%${q}%,id.eq.${/^[0-9a-f-]{36}$/.test(q) ? q : '00000000-0000-0000-0000-000000000000'}`);
  const { data } = await query;
  const rows = (data ?? []) as Profile[];
  const ids = rows.map((r) => r.id);
  const { data: counts } = ids.length ? await db.from('listings').select('seller_id, status').in('seller_id', ids) : { data: [] };
  const { data: reps } = ids.length ? await db.from('reports').select('reported_user_id').in('reported_user_id', ids) : { data: [] };
  const listingCount = (id: string) => (counts ?? []).filter((c) => c.seller_id === id && c.status !== 'deleted').length;
  const reportCount = (id: string) => (reps ?? []).filter((r) => r.reported_user_id === id).length;
  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 200 });
  const email = (id: string) => authUsers?.users.find((u) => u.id === id)?.email ?? '—';
  const provider = (id: string) => authUsers?.users.find((u) => u.id === id)?.app_metadata?.provider ?? '';

  return (
    <>
      <H1 sub="Every account · ban blocks posting/chat/offers at the database level · delete cascades everything">Members</H1>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="name, suburb or user id" className="w-80 rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        <Btn tone="teal" type="submit">Search</Btn>
      </form>
      {rows.length === 0 ? <Empty>No members match.</Empty> : (
        <Table head={['Member', 'Sign-in', 'Suburb', 'Joined', 'Listings', 'Reports', 'Status', 'Actions']}>
          {rows.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="px-4 py-3">
                <div className="font-medium">{p.display_name || <span className="text-stone-400">(no name)</span>}</div>
                <div className="text-xs text-stone-500">{email(p.id)}</div>
                <div className="font-mono text-[10px] text-stone-400">{p.id}</div>
              </td>
              <td className="px-4 py-3 text-xs">{provider(p.id)}{p.is_phone_verified && <> · <Badge tone="teal">phone ✓</Badge></>}</td>
              <td className="px-4 py-3">{p.suburb ?? '—'}{p.suburb_verified_at && ' ✓'}<div className="text-xs text-stone-500">{p.nationality ?? ''} · {p.preferred_language ?? ''}</div></td>
              <td className="px-4 py-3 text-xs" title={when(p.created_at)}>{ago(p.created_at)}</td>
              <td className="px-4 py-3 tabular-nums">{listingCount(p.id)}</td>
              <td className="px-4 py-3 tabular-nums">{reportCount(p.id) > 0 ? <Badge tone="amber">{reportCount(p.id)}</Badge> : 0}</td>
              <td className="px-4 py-3">{p.banned ? <Badge tone="red">banned</Badge> : <Badge tone="green">active</Badge>}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <form action={setBanned.bind(null, p.id, !p.banned, undefined)}><Btn tone={p.banned ? 'stone' : 'red'}>{p.banned ? 'Unban' : 'Ban'}</Btn></form>
                  <form action={deleteUser.bind(null, p.id, undefined)}><Btn tone="red">Delete</Btn></form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
