import 'server-only';

const BASE = 'https://api.supabase.com/v1';
const REF = process.env.SUPABASE_PROJECT_REF!;
const TOK = process.env.SUPABASE_ACCESS_TOKEN ?? '';

export type Lint = {
  name: string; title: string; level: 'ERROR' | 'WARN' | 'INFO';
  categories: string[]; description: string; detail: string; remediation?: string;
  metadata?: { name?: string; type?: string };
};

async function mgmt<T>(path: string): Promise<T | null> {
  if (!TOK) return null;
  try {
    const r = await fetch(`${BASE}/projects/${REF}/${path}`, {
      headers: { Authorization: `Bearer ${TOK}` }, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

export const securityLints = () => mgmt<{ lints: Lint[] }>('advisors/security');
export const performanceLints = () => mgmt<{ lints: Lint[] }>('advisors/performance');
export const serviceHealth = () => mgmt<{ name: string; healthy: boolean; status: string }[]>('health?services=auth,db,rest,storage,realtime');
export const hasToken = () => !!TOK;

// Findings reviewed and accepted by design — keep the page's signal clean.
// Each entry: lint name + a substring of `detail` + the reason (shown in UI).
export const ACCEPTED: { name: string; match: string; why: string }[] = [
  { name: 'rls_enabled_no_policy', match: 'admin_audit_log', why: 'service-role-only table (admin console audit log); no client policies by design' },
  { name: 'rls_disabled_in_public', match: 'spatial_ref_sys', why: 'PostGIS EPSG catalog owned by supabase_admin — cannot be altered; holds no user data (spec-security-hardening)' },
  { name: 'security_definer_view', match: 'profile_trust', why: 'owner-rights aggregate view is the design (ADR-008): exposes counts only' },
  { name: 'security_definer_view', match: 'listing_favorite_counts', why: 'owner-rights aggregate view; counts only' },
  { name: 'auth_rls_initplan', match: '', why: 'known perf backlog (24 policies) — deferred post-launch, tracked in wiki log 2026-08-20' },
  { name: 'unindexed_foreign_keys', match: '', why: 'tiny tables at current scale; revisit at growth stage (spec-ops-roadmap)' },
];
export function acceptedReason(l: Lint): string | null {
  for (const a of ACCEPTED) if (a.name === l.name && (!a.match || l.detail?.includes(a.match))) return a.why;
  return null;
}
