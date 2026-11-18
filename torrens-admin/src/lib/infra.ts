import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const run = promisify(execFile);
const REPO = join(process.cwd(), '..');

export function backups() {
  const base = process.env.BACKUP_DIR ?? '';
  if (!base || !existsSync(base)) return [];
  return readdirSync(base).filter((n) => /^\d{8}-\d{4}$/.test(n)).sort().reverse().map((stamp) => {
    try { return { stamp, ...JSON.parse(readFileSync(join(base, stamp, 'manifest.json'), 'utf8')) }; } catch { return { stamp }; }
  });
}
export async function health() {
  const url = process.env.SUPABASE_URL!;
  const anon = process.env.SUPABASE_ANON_KEY ?? '';
  const probe = async (name: string, u: string, headers: Record<string, string> = {}) => {
    const t = Date.now();
    try { const r = await fetch(u, { headers, cache: 'no-store', signal: AbortSignal.timeout(6000) }); return { name, ok: r.ok, status: r.status, ms: Date.now() - t }; }
    catch (e) { return { name, ok: false, status: 0, ms: Date.now() - t, err: String(e).slice(0, 60) }; }
  };
  const [rest, auth, storage, edge, status] = await Promise.all([
    probe('REST', `${url}/rest/v1/categories?select=id&limit=1`, { apikey: anon, Authorization: `Bearer ${anon}` }),
    probe('Auth', `${url}/auth/v1/health`, { apikey: anon }),
    probe('Storage', `${url}/storage/v1/object/public/listing-photos/health-probe`),
    probe('Edge fn (ops-alert, expect 401)', `${url}/functions/v1/ops-alert`),
    (async () => { try { const r = await fetch('https://status.supabase.com/api/v2/status.json', { cache: 'no-store', signal: AbortSignal.timeout(6000) }); const j = await r.json(); return { indicator: j.status?.indicator, description: j.status?.description }; } catch { return { indicator: 'unknown', description: 'status page unreachable' }; } })(),
  ]);
  storage.ok = storage.status === 400 || storage.status === 404 || storage.ok; // bucket answers → service up
  edge.ok = edge.status === 401 || edge.status === 403;
  return { probes: [rest, auth, storage, edge], status };
}
export async function appStore() {
  try { const r = await fetch('https://itunes.apple.com/lookup?id=6803434941&country=au', { cache: 'no-store', signal: AbortSignal.timeout(6000) }); const j = await r.json(); const a = j.results?.[0]; return a ? { version: a.version, released: a.currentVersionReleaseDate, rating: a.averageUserRating, ratings: a.userRatingCount, url: a.trackViewUrl } : null; } catch { return null; }
}
export async function cli(cmd: string, args: string[], cwd = REPO) {
  try { const { stdout } = await run(cmd, args, { cwd, timeout: 60000, env: { ...process.env, CI: '1' } }); return stdout; } catch (e) { return `ERR ${String((e as Error).message).slice(0, 120)}`; }
}
export async function otaUpdates() { const out = await cli('npx', ['eas-cli', 'update:list', '--branch', 'production', '--limit', '6', '--json', '--non-interactive']); try { const j = JSON.parse(out.slice(out.indexOf('{'))); return (j.currentPage ?? []) as { group: string; message: string; createdAt: string; runtimeVersion: string }[]; } catch { return []; } }
export async function builds() { const out = await cli('npx', ['eas-cli', 'build:list', '--platform', 'ios', '--limit', '5', '--json', '--non-interactive']); try { return JSON.parse(out.slice(out.indexOf('['))) as { id: string; status: string; appBuildVersion: string; appVersion: string; createdAt: string }[]; } catch { return []; } }
export async function keepalive() { const out = await cli('gh', ['run', 'list', '--workflow=keepalive.yml', '--limit', '5', '--json', 'status,conclusion,createdAt']); try { return JSON.parse(out) as { status: string; conclusion: string; createdAt: string }[]; } catch { return []; } }
