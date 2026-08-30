import { db } from '@/lib/db';
import { H1, Card, Badge, Btn, Table } from '@/components/ui';
import { when, ago, mb } from '@/lib/format';
import { backups, health, appStore, otaUpdates, builds, keepalive } from '@/lib/infra';
import { runBackupNow, restoreDrill } from '@/lib/infra-actions';
export const dynamic = 'force-dynamic';

const RUNBOOK = [
  ['Is it Supabase?', 'Check status card below + status.supabase.com. Platform incident → wait, post banner (Kill switches).'],
  ['Auth only down?', 'Guests can still browse; sign-in fails. Post banner in 3 languages; no code change.'],
  ['Bad OTA?', 'eas update:republish --group <previous> (see OTA list) — devices converge on next cold start.'],
  ['Data damage (bad script/migration)?', 'Restore latest local snapshot: pg_restore into a branch/scratch DB, verify, then targeted repair. Photos in the same snapshot.'],
  ['Abuse wave?', 'Uploads OFF (Kill switches) → ban actors (Members) → hide listings (Reports) → check Supabase usage.'],
  ['Leaked key?', 'Rotate in Supabase → update .env.local + EAS secrets + GitHub secrets → restart edge functions → note here (audit).'],
];

export default async function Infra() {
  const [b, h, store, ota, bl, ka, { data: drills }] = await Promise.all([
    Promise.resolve(backups()), health(), appStore(), otaUpdates(), builds(), keepalive(),
    db.from('admin_audit_log').select('at, action, after').in('action', ['backup.run', 'backup.restore_drill']).order('at', { ascending: false }).limit(5),
  ]);
  const last = b[0];
  const stale = last ? (Date.now() - new Date(`${last.stamp.slice(0,4)}-${last.stamp.slice(4,6)}-${last.stamp.slice(6,8)}T${last.stamp.slice(9,11)}:${last.stamp.slice(11,13)}:00`).getTime()) > 36 * 3600e3 : true;
  return (
    <>
      <H1 sub="Live health, backups & restore drill, releases, and the first-15-minutes incident runbook">Infra & disaster readiness</H1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-sm font-semibold">Live health <span className="text-xs font-normal text-stone-500">(probed just now)</span></div>
          <ul className="mt-2 space-y-1 text-sm">{h.probes.map((p) => <li key={p.name} className="flex justify-between"><span>{p.name}</span><span className="tabular-nums text-xs"><Badge tone={p.ok ? 'green' : 'red'}>{p.ok ? 'up' : 'DOWN'}</Badge> {p.status} · {p.ms}ms</span></li>)}</ul>
          <div className="mt-3 text-xs">Supabase platform: <Badge tone={h.status.indicator === 'none' ? 'green' : h.status.indicator === 'unknown' ? 'stone' : 'amber'}>{h.status.description}</Badge></div>
          <div className="mt-2 text-xs text-stone-500">Keepalive runs: {ka.length ? ka.map((r) => (r.conclusion === 'success' ? '✅' : r.status === 'in_progress' ? '⏳' : '❌')).join(' ') : '—'} <span className="text-stone-400">(newest first)</span></div>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><div className="text-sm font-semibold">Backups</div><Badge tone={stale ? 'red' : 'green'}>{stale ? 'STALE >36h' : 'fresh'}</Badge></div>
          <ul className="mt-2 space-y-1 text-xs">{b.slice(0, 5).map((s) => <li key={s.stamp} className="flex justify-between"><span className="font-mono">{s.stamp}</span><span className="text-stone-500">db {mb(s.dbBytes)} · {s.files ?? '?'} files {mb(s.fileBytes)}</span></li>)}{!b.length && <li className="text-red-600">no snapshots — run one now</li>}</ul>
          <div className="mt-3 flex gap-2"><form action={runBackupNow}><Btn tone="teal">Run backup now</Btn></form><form action={restoreDrill}><Btn>Restore drill (local)</Btn></form></div>
          <p className="mt-2 text-[11px] text-stone-500">Daily 03:30 launchd → ~/Backups + iCloud Drive · 14 kept · restore drill = pg_restore into local DB <code>torrens_drill</code> and count rows</p>
          {!!drills?.length && <ul className="mt-2 space-y-1 text-[11px] text-stone-600">{drills.map((d, i) => <li key={i}><span className="text-stone-400">{ago(d.at)}</span> {d.action}: {JSON.stringify(d.after).slice(0, 140)}</li>)}</ul>}
        </Card>
        <Card>
          <div className="text-sm font-semibold">Releases</div>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-500">App Store (AU)</dt><dd>{store ? <>v{store.version} · {ago(store.released)} · {store.ratings ? `${store.rating?.toFixed(1)}★ (${store.ratings})` : 'no ratings yet'}</> : '—'}</dd>
            <dt className="text-stone-500">Latest builds</dt><dd className="text-xs">{bl.slice(0, 3).map((x) => <div key={x.id}>{x.appVersion} ({x.appBuildVersion}) <Badge tone={x.status === 'FINISHED' ? 'green' : x.status === 'IN_PROGRESS' ? 'amber' : 'stone'}>{x.status}</Badge> <span className="text-stone-400">{ago(x.createdAt)}</span></div>)}{!bl.length && '—'}</dd>
          </dl>
          <div className="mt-3 text-sm font-semibold">Production OTA (newest first)</div>
          <ul className="mt-1 space-y-1 text-xs">{ota.map((u) => <li key={u.group}><span className="font-mono text-teal-700">{u.group.slice(0, 8)}</span> <span className="text-stone-400">rt {u.runtimeVersion} · {ago(u.createdAt)}</span> — {u.message}</li>)}{!ota.length && <li className="text-stone-400">eas-cli unavailable</li>}</ul>
          <p className="mt-2 text-[11px] text-stone-500">Rollback: <code>eas update:republish --group &lt;previous&gt;</code></p>
        </Card>
      </div>
      <div className="mt-6">
        <div className="mb-2 text-sm font-semibold">Incident runbook — first 15 minutes</div>
        <Table head={['Symptom', 'Do this']}>{RUNBOOK.map(([s, d]) => <tr key={s}><td className="px-4 py-2 font-medium">{s}</td><td className="px-4 py-2 text-sm text-stone-700">{d}</td></tr>)}</Table>
        <p className="mt-2 text-xs text-stone-500">Full runbook and RTO/RPO promises: vault → spec-disaster-recovery. Generated {when(new Date().toISOString())}.</p>
      </div>
    </>
  );
}
