# ADR 003 — Backend: Supabase, with an Extraction Path

## Context
Solo developer, hard portfolio deadline (visa 2026-09-10), and an MVP whose core queries are relational and geographic: compound filters (distance + category + nationality + verified), per-category JSONB attributes (`spec-categories`), keyword matching (`spec-mvp`), photo storage, realtime chat, social auth (`002-auth-strategy`). Long-term goal includes real operation and growth (`core-context`).

## Options considered
- **(a) Supabase** — managed Postgres + Auth + Storage + Realtime + Edge Functions; open-source, self-hostable
- **(b) Firebase** — mature BaaS but NoSQL; compound relational filters and geo queries are awkward; proprietary lock-in
- **(c) Custom backend (Node/NestJS + Postgres)** — maximal control and backend-portfolio value; months of infra work before first listing ships

## Decision
**Supabase**, with a deliberate long-term extraction path:
- v1: everything on Supabase (Postgres w/ PostGIS + JSONB, Auth, Storage, Realtime for chat).
- **Keyword-alert matching implemented as our own service/Edge Function** — the showcase backend component.
- As scale demands, extract bottleneck domains (alerts, then chat) into standalone services; the Postgres data layer migrates unchanged (standard SQL, self-hostable Supabase or RDS).

## Why
1. The data model is portable Postgres — no long-term lock-in at the layer that matters.
2. Firebase's NoSQL fights our core feature set (compound filters, geo, structured attributes).
3. Ship-first beats infra-first: an unlaunched app has no long term; this is the standard BaaS→extraction growth path.
4. Career: a shipped store app + ADR-documented judgment + one well-built custom service beats an unfinished custom backend.

## Consequences
- ERD designed as plain Postgres (PostGIS for distance, JSONB for category attributes, FTS for keywords).
- Row Level Security (RLS) policies are part of the design — security posture lives in the DB.
- Push notifications via Expo Push + an alert-matching function (our custom component).
- Revisit extraction when: sustained load, Realtime chat limits, or alert-matching latency degrade UX.
