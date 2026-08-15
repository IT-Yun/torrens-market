// Pure formatting helpers — no React/Supabase dependencies, unit-tested
// in tests/format.test.ts.

/** "$1,234" AUD display; zero renders as a free-item label. */
export function formatPrice(priceCents: number): string {
  if (priceCents === 0) return 'Free';
  return `$${(priceCents / 100).toLocaleString('en-AU', { maximumFractionDigits: 2 })}`;
}

/** Compact relative age: 1m…59m, 1h…23h, then days. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const mins = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * One-line category-specific snippet for feed cards — the Karrot
 * used-car-card pattern ("2019 · 82,000km") generalized to our categories.
 * Values are language-neutral (numbers, units, dates). At most two parts.
 */
export function attributeSnippet(attributes: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const a = attributes ?? {};
  if (a.year) parts.push(String(a.year));
  if (a.odometer_km) parts.push(`${Number(a.odometer_km).toLocaleString('en-AU')}km`);
  if (a.dimensions) parts.push(`${a.dimensions}cm`);
  if (a.brand) parts.push(String(a.brand));
  else if (a.brand_model) parts.push(String(a.brand_model));
  if (a.expiry_date) parts.push(`EXP ${a.expiry_date}`);
  if (a.best_before) parts.push(`BB ${a.best_before}`);
  if (a.size) parts.push(String(a.size));
  return parts.length ? parts.slice(0, 2).join(' · ') : null;
}

/**
 * ISO 3166-1 alpha-2 → flag emoji via regional indicator symbols.
 * Returns null for non-country codes (e.g. our 'OTHER' bucket).
 */
export function flagEmoji(code: string | null | undefined): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const base = 0x1f1e6 - 65;
  const upper = code.toUpperCase();
  return (
    String.fromCodePoint(base + upper.charCodeAt(0)) +
    String.fromCodePoint(base + upper.charCodeAt(1))
  );
}
