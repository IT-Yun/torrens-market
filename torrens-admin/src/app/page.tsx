import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '@/lib/db';
import { H1, Stat, Card } from '@/components/ui';
import { when } from '@/lib/format';

export const dynamic = 'force-dynamic';

function lastBackup() {
  const base = process.env.BACKUP_DIR ?? '';
  if (!base || !existsSync(base)) return null;
  const snaps = readdirSync(base).filter((n) => /^\d{8}-\d{4}$/.test(n)).sort();
  const last = snaps.at(-1);
  if (!last) return null;
  try { return { stamp: last, count: snaps.length, ...JSON.parse(readFileSync(join(base, last, 'manifest.json'), 'utf8')) }; }
  catch { return { stamp: last, count: snaps.length }; }
}

export default async function Dashboard() {
  const since = new Date(Date.now() - 7 * 86400e3).toISOString();
  const [users, newUsers, active, reserved, sold, openReports, feedback, banned] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'reserved'),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
    db.from('reports').select('id', { count: 'exact', head: true }).is('resolved_at', null),
    db.from('feedback').select('id', { count: 'exact', head: true }).eq('resolved', false),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('banned', true),
  ]);
  const b = lastBackup();
  const mb = (n?: number) => (n ? (n / 1048576).toFixed(1) + ' MB' : '—');
  return (
    <>
      <H1 sub="Torrens Market · production · read from Supabase with the service role">Dashboard</H1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Members" value={users.count ?? 0} hint={`+${newUsers.count ?? 0} in 7 days · ${banned.count ?? 0} banned`} />
        <Stat label="Active listings" value={active.count ?? 0} hint={`${reserved.count ?? 0} reserved · ${sold.count ?? 0} sold`} />
        <Stat label="Open reports" value={openReports.count ?? 0} hint="unresolved queue" />
        <Stat label="Feedback" value={feedback.count ?? 0} hint="unresolved" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">Last local backup</div>
          {b ? (
            <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-stone-500">Snapshot</dt><dd className="tabular-nums">{b.stamp} ({b.count} kept)</dd>
              <dt className="text-stone-500">Database</dt><dd>{mb(b.dbBytes)}</dd>
              <dt className="text-stone-500">Storage files</dt><dd>{b.files ?? '—'} · {mb(b.fileBytes)}</dd>
              <dt className="text-stone-500">Took</dt><dd>{b.tookSec ? `${b.tookSec}s` : '—'}</dd>
            </dl>
          ) : <p className="mt-2 text-sm text-stone-500">No snapshot found in {process.env.BACKUP_DIR}</p>}
          <p className="mt-3 text-xs text-stone-500">Daily 03:30 via launchd · mirrored to iCloud Drive · Telegram on failure</p>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Ops channels</div>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            <li>🙋 sign-ups · 🛍 new listings · 🚩 reports → Telegram (live)</li>
            <li>📝 feedback · ⚠️ auto-hide · 🚨 report milestones → Telegram (live)</li>
            <li>Keepalive ping daily (GitHub Actions) — Free tier never idles</li>
            <li>Generated {when(new Date().toISOString())}</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
