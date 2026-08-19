# Security Architecture

How Torrens Market is secured, in enough detail to audit it. The one-line
policy version lives in [SECURITY.md](../SECURITY.md); this document is the
engineering view. The core stance:

> **The client is untrusted.** The mobile bundle ships only the public anon
> key. Every authorization decision is made inside PostgreSQL (RLS, column
> privileges, `SECURITY DEFINER` RPCs) or in server-side Edge Functions.

## 1. Authentication

- **Email OTP** — 6-digit codes over custom SMTP; email verification is
  mandatory (no auto-confirm). Social login (Google/Apple, PKCE) is wired in
  the client pending provider config (ADR-002).
- **Phone verification is a badge, not a gate** — optional SMS verification
  grants a profile badge and a "verified only" search filter. The flow is
  server-side (Twilio Verify + Fraud Guard, AU-only, rate-limited) and the
  resulting column is locked so clients cannot self-assign it (ADR-013,
  migrations 028–029).
- Sessions auto-refresh on app foreground; PKCE flow for OAuth.

## 2. Authorization — RLS as the single source of truth

Every application table has Row-Level Security enabled. Representative
policies (full text in [`supabase/migrations/`](../supabase/migrations/)):

| Data | Rule enforced by Postgres |
|---|---|
| listings | anyone reads `active`; only the seller writes; `deleted` visible to owner only |
| messages / meetups / offers | **room participants only**, via a `SECURITY DEFINER` membership check (`is_room_participant`) |
| favorites, keyword_alerts, push_tokens, blocked_users | owner only |
| reports | insert-only for users; readable only with the service role |
| reviews | trade participants; write-once; trust points computed in-DB |
| profiles | public read; owner-only writes; trust/verification columns additionally locked by column privileges + guard trigger |

**Negative testing**: the live E2E suite (`scripts/e2e-journey.mjs`, 46 steps,
CI on every push) includes adversarial cases — an outsider reading a chat
room, self-reviews, double offers, cross-tenant writes — and asserts they are
*rejected*.

## 3. SECURITY DEFINER surface (kept deliberately small)

Definer code is the only place RLS is bypassed, so it is minimized and locked:

- **RPCs** (`start_chat`, `bump_listing`, `increment_view`, `mark_read`,
  `is_room_participant`): `EXECUTE` revoked from `public`/`anon`; granted to
  `authenticated` only; `search_path` pinned.
- **Trigger functions** (profile auto-create, push fan-out, report auto-hide,
  status tracking): `EXECUTE` revoked from *all* client roles — only triggers
  run them.
- **Views** (`listing_favorite_counts`, `profile_trust`): expose intentional
  public aggregates (♥ counts, trust tier) while the underlying rows stay
  RLS-protected. Flagged by the Supabase advisor by design; accepted and
  documented (ADR-008).
- Edge Functions verify a shared `x-notify-secret` header so only database
  triggers (pg_net) can invoke them.

## 4. Privacy

- **Location**: coordinates are rounded to a ~1.1 km grid **on the device**;
  exact GPS never reaches the server (ADR-006). Suburb verification stores
  only a timestamp, not a location.
- **Chat photos**: a private Storage bucket; access via short-lived signed
  URLs issued only to room participants.
- **Account deletion**: self-service, cascades through listings, chats,
  reviews, tokens ([PRIVACY.md](../PRIVACY.md)).
- No analytics SDKs; push tokens are the only device identifiers stored.

## 5. Abuse & cost defense

- 3 distinct reporters auto-hide a listing (server trigger).
- Blocking hides listings both ways and refuses new chat rooms (migration 014).
- Bump limited to once/24 h using **server time** (clock-skew safe, ADR-010).
- SMS verification is AU-number-only, rate-limited, CAPTCHA-gated, with a
  provider Spend Cap — see the denial-of-wallet analysis in the project wiki.

## 6. Supply chain & operations

- CI: gitleaks (secret scanning), `npm audit`, CodeQL, unit tests, i18n
  parity check, and the live E2E journey.
- Secrets live in EAS/Edge Function secret stores; `.env*` is gitignored; the
  repo has never contained a secret (verified by scanning history).
- Backups + outage runbook + OTA rollback: `docs` in the project wiki
  (disaster-recovery spec); JS-level security fixes ship over-the-air within
  hours via EAS Update (ADR-012).

## 7. Known-accepted advisor findings

| Finding | Status |
|---|---|
| `spatial_ref_sys` readable | PostGIS EPSG constants table (no user data, not owned by us — RLS cannot be enabled). Verified harmless. |
| Definer views | Intentional public aggregates (see §3). |
| `postgis`/`pg_net` in `public` schema | Platform default; moving them is planned with the next major schema change. |

*Last full audit: 2026-08-19 — anon-key probes against every sensitive table
returned zero rows; advisor findings triaged as above; E2E 46/46 after
hardening migration 027.*
