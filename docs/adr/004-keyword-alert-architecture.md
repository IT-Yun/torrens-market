# ADR 004 — Keyword-Alert Architecture

## Context
Keyword alerts are the product's top-priority feature (`spec-mvp`) and the designated backend showcase (`003-backend-supabase`). Requirement: when a listing is posted, subscribed users get a push within seconds — without slowing down the listing INSERT.

## Options considered
- **(a) DB trigger + pg_net → Edge Function → Expo push** — async HTTP from Postgres; matching logic in a deployable, testable function
- **(b) Client-side matching via Realtime** — every device subscribes to all listing INSERTs and matches locally; wasteful, misses offline users, leaks all listings to all clients
- **(c) Polling cron** — an Edge Function on a schedule scans new listings; adds latency (minutes), wasteful when idle
- **(d) External queue (SQS/Redis)** — proper at scale, premature now and violates the ship-first principle

## Decision
**(a).** `listings` INSERT trigger fires `pg_net.http_post` (async, non-blocking) to the `keyword-alert-matcher` Edge Function. The function (service role) loads the listing, filters active `keyword_alerts` (case-insensitive keyword match on title+description, category and max-price constraints, seller's own alerts excluded), resolves `push_tokens`, and posts to Expo's push API in batches of 100.

## Why
1. Listing INSERT latency is untouched — the HTTP call is queued by pg_net.
2. Matching lives in one deployable unit with logs — the "custom service" a portfolio reviewer can read.
3. Offline users still get notified (server-side push, not client subscriptions).
4. Clean extraction path: if volume grows, the same function body moves behind a queue (option d) without schema changes.

## Consequences
- Substring matching for v1 (works for KO/EN/ZH since it's not stemming-dependent); FTS-based matching with `search_vector` is the upgrade path.
- Function is deployed `--no-verify-jwt` (called by the DB, carries no user JWT); it only reads with service role and never exposes an unauthenticated data path — verify this stays true when extending.
- Real device push requires an EAS build (Expo Go limitation) — part of M6.
