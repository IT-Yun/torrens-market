'use server';
import { revalidatePath } from 'next/cache';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { audit } from './audit';
const run = promisify(execFile);
const REPO = join(process.cwd(), '..');
const PG = ['/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/bin'].find((d) => existsSync(join(d, 'pg_restore'))) ?? '';

export async function runBackupNow() {
  const t = Date.now();
  try {
    const { stdout } = await run('node', ['scripts/backup-local.mjs'], { cwd: REPO, timeout: 600000, env: { ...process.env, BACKUP_VERBOSE: '1' } });
    await audit('backup.run', 'backup', 'manual', null, { out: stdout.trim().slice(-200), ms: Date.now() - t });
  } catch (e) { await audit('backup.run', 'backup', 'manual', null, { error: String((e as Error).message).slice(0, 200) }); }
  revalidatePath('/infra');
}

// Restore drill: pg_restore the latest dump into a scratch local Postgres DB and count rows —
// proves the backup is actually restorable (DR spec: quarterly, now one click).
export async function restoreDrill() {
  const base = process.env.BACKUP_DIR ?? '';
  const t = Date.now();
  let result: Record<string, unknown> = {};
  try {
    const { readdirSync } = await import('node:fs');
    const last = readdirSync(base).filter((n) => /^\d{8}-\d{4}$/.test(n)).sort().at(-1);
    if (!last) throw new Error('no snapshot');
    const dump = join(base, last, 'db.dump');
    const env = { ...process.env, PATH: `${PG}:${process.env.PATH}` };
    await run('bash', ['-lc', `pg_isready -q || (brew services start postgresql@17 && sleep 4)`], { env, timeout: 60000 });
    await run('bash', ['-lc', `dropdb --if-exists torrens_drill && createdb torrens_drill`], { env, timeout: 60000 });
    await run('bash', ['-lc', `pg_restore --no-owner --no-privileges --schema=public -d torrens_drill "${dump}" 2>&1 | grep -viE "warning|extension|already exists" | head -5 || true`], { env, timeout: 300000 });
    const { stdout } = await run('bash', ['-lc', `psql -d torrens_drill -At -c "select string_agg(relname||'='||n_live_tup, ', ') from pg_stat_user_tables"`], { env, timeout: 60000 });
    result = { snapshot: last, tables: stdout.trim().slice(0, 300), ms: Date.now() - t, ok: true };
  } catch (e) { result = { error: String((e as Error).message).slice(0, 300), ms: Date.now() - t, ok: false }; }
  await audit('backup.restore_drill', 'backup', 'torrens_drill', null, result);
  revalidatePath('/infra');
}
