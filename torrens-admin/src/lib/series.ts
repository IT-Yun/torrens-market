// Bucket ISO timestamps into a daily series for the last N days (Adelaide time).
export function dailySeries(rows: { created_at: string }[], days = 30) {
  const out: { day: string; n: number }[] = [];
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Australia/Adelaide' });
  const counts = new Map<string, number>();
  for (const r of rows) { const k = fmt(new Date(r.created_at)); counts.set(k, (counts.get(k) ?? 0) + 1); }
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400e3); const k = fmt(d); out.push({ day: k, n: counts.get(k) ?? 0 }); }
  return out;
}
export function topN<T extends string | null | undefined>(values: T[], n = 8) {
  const m = new Map<string, number>();
  for (const v of values) { const k = (v ?? '—') as string; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
