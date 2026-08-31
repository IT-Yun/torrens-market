// Local daily backup (ADR-017 / Free-tier decision 2026-08-30).
// Supabase Free has no platform backups, so Sean's Mac takes one every day:
//   1) Postgres dump via pg_dump over the session pooler (roles excluded)
//   2) Every Storage bucket downloaded with the service key (photos/avatars/chat)
//   3) Snapshot folder mirrored to iCloud Drive (offsite copy), 14 daily kept
//   4) One-line Telegram report via the bridge's notify.py (silent on success)
// Usage: node scripts/backup-local.mjs   (reads .env / .env.local; never prints secrets)
import { createClient } from '@supabase/supabase-js';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, cpSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
for (const f of ['.env', '.env.local']) {
  try { for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  } } catch {}
}
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DBPW = process.env.SUPABASE_DB_PASSWORD;
const POOLER = readFileSync('supabase/.temp/pooler-url', 'utf8').trim().split('\n')[0];
const PG_DUMP = ['/opt/homebrew/opt/postgresql@17/bin/pg_dump', '/opt/homebrew/bin/pg_dump', 'pg_dump'].find(p => { try { return p === 'pg_dump' || existsSync(p); } catch { return false; } });
const NOTIFY = '/Users/seungyunlee/Workspace/나만의 ai 만들기 /seanwiki/telegram-bridge/notify.py';
const BASE = join(homedir(), 'Backups', 'torrens-market');
const ICLOUD = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/TorrensMarket-Backups');
// Local (Adelaide) time: a snapshot named 20260830-1812 for a 31 Aug 03:42 run
// reads like a day-old backup to the operator. Name by wall-clock time.
const _now = new Date();
const _p = (n) => String(n).padStart(2, '0');
const _l = new Date(_now.toLocaleString('en-US', { timeZone: 'Australia/Adelaide' }));
const stamp = `${_l.getFullYear()}${_p(_l.getMonth() + 1)}${_p(_l.getDate())}-${_p(_l.getHours())}${_p(_l.getMinutes())}`;
const dir = join(BASE, stamp);
mkdirSync(dir, { recursive: true });
const t0 = Date.now();
const notify = (level, msg) => { try { spawnSync('python3', [NOTIFY, level, msg], { stdio: 'ignore' }); } catch {} };

try {
  if (!URL || !SERVICE || !DBPW) throw new Error('missing env (URL/SERVICE/DB password)');
  // 1) database dump — pooler URL has no password; pass via PGPASSWORD
  const dumpPath = join(dir, 'db.dump');
  execFileSync(PG_DUMP, ['--format=custom', '--no-owner', '--no-privileges', '--schema=public', '--schema=private', '--schema=auth', '--schema=storage', '-f', dumpPath, POOLER],
    { env: { ...process.env, PGPASSWORD: DBPW }, stdio: ['ignore', 'ignore', 'pipe'] });
  const dbBytes = statSync(dumpPath).size;
  if (dbBytes < 10_000) throw new Error(`db dump suspiciously small: ${dbBytes} bytes`);

  // 2) storage buckets
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data: buckets, error: bErr } = await admin.storage.listBuckets();
  if (bErr) throw bErr;
  let files = 0, fileBytes = 0;
  async function walk(bucket, prefix) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) { await walk(bucket, path); continue; } // folder
      const { data: blob, error: dErr } = await admin.storage.from(bucket).download(path);
      if (dErr) throw dErr;
      const out = join(dir, 'storage', bucket, path);
      mkdirSync(dirname(out), { recursive: true });
      const buf = Buffer.from(await blob.arrayBuffer());
      writeFileSync(out, buf); files++; fileBytes += buf.length;
    }
  }
  for (const b of buckets) await walk(b.name, '');

  // 3) manifest + iCloud mirror + rotation (keep 14)
  const manifest = { stamp, dbBytes, buckets: buckets.map(b => b.name), files, fileBytes, tookSec: Math.round((Date.now() - t0) / 1000) };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  mkdirSync(ICLOUD, { recursive: true });
  cpSync(dir, join(ICLOUD, stamp), { recursive: true });
  for (const base of [BASE, ICLOUD]) {
    const snaps = readdirSync(base).filter(n => /^\d{8}-\d{4}$/.test(n)).sort();
    for (const old of snaps.slice(0, Math.max(0, snaps.length - 14))) rmSync(join(base, old), { recursive: true, force: true });
  }
  const mb = (n) => (n / 1048576).toFixed(1) + 'MB';
  console.log(`OK ${stamp}: db ${mb(dbBytes)}, ${files} files ${mb(fileBytes)}, ${manifest.tookSec}s → ${dir} (+iCloud)`);
  // success stays silent on Telegram unless it's the first run of the day flagged by env
  if (process.env.BACKUP_VERBOSE) notify('success', `Backup OK ${stamp}: db ${mb(dbBytes)}, ${files} files ${mb(fileBytes)}`);
} catch (e) {
  const msg = String(e?.message ?? e).slice(0, 300);
  console.error('BACKUP FAILED:', msg);
  // never leave a partial snapshot behind — the console treats the newest
  // folder as the last good backup
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
  notify('error', `Backup FAILED ${stamp}: ${msg}`);
  process.exit(1);
}
