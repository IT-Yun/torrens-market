export const aud = (cents: number) => `$${(cents / 100).toLocaleString('en-AU')}`;
export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Adelaide' }) : '—';
export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
export const mb = (n?: number | null) => (n == null ? '—' : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
export const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '0%');
