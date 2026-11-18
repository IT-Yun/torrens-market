# Database Guide

One page to understand the entire data layer: what each table does, the design
patterns behind it, and how authorization works. PostgreSQL on Supabase
(ap-southeast-2). Schema lives in [`supabase/migrations/`](../supabase/migrations/) —
29 ordered, replayable migrations; nothing was ever changed by hand.

## Tables by domain

**Identity & trust**
| Table | Purpose | Access (RLS) |
|---|---|---|
| `profiles` | 1:1 with `auth.users`; display name, suburb (+GPS-verified flag), self-declared nationality, preferred language, phone-verified badge | readable by all; only the owner writes; trust/verification columns locked by trigger + column privileges |
| `reviews` | 1 review per side per completed trade; the source of trust points | participants only; write-once |
| `push_tokens` | Expo push tokens per device | owner only |

**Marketplace**
| Table | Purpose | Access (RLS) |
|---|---|---|
| `categories` | 12 categories; `field_template` JSONB defines each category's custom listing fields in 3 languages | read-only to clients; changed only via migrations |
| `listings` | The core object: price, condition, pickup mode, payment method, ~1.1 km-fuzzed coords, JSONB `attributes` (category fields), FTS vector, `sort_ts` for bump ordering | active listings readable by all; seller-only writes; soft delete (`deleted` visible to owner only) |
| `listing_photos` | ordered photos per listing (Storage paths) | follow the parent listing |
| `favorites` | user ⭤ listing hearts | owner only (public counts exposed via a view) |
| `keyword_alerts` | saved keywords (+optional category/max price) that trigger push on matching listings | owner only |
| `reports` | user reports on listings (spam/scam/…); 3 distinct reporters auto-hide a listing | insert-only for users; readable only server-side |
| `blocked_users` | personal block list; hides listings and refuses new chats both ways | owner only |

**Deal-making (all inside chat)**
| Table | Purpose | Access (RLS) |
|---|---|---|
| `chat_rooms` / `chat_participants` / `messages` | 1:1 realtime chat per listing; unread state via `last_read_at`; photo messages use a private Storage bucket | room participants only — enforced by a `SECURITY DEFINER` membership check |
| `meetups` | one active pickup proposal per room (time + place); accepting reserves the listing, cancelling releases it; pg_cron sends 1-hour reminders | room participants only |
| `offers` | one open price offer per room; accept/decline/withdraw state machine | room participants only |

**Views (read-only, intentional aggregates)**
| View | Exposes | Why SECURITY DEFINER |
|---|---|---|
| `listing_favorite_counts` | listing_id → ♥ count | counts are public UI data while individual hearts stay private |
| `profile_trust` | user → trust points/tier (quokka→kangaroo) | tier is public by design; the reviews behind it are not |

**Storage buckets**: `listing-photos` (public read, auth upload), `avatars`
(public read, owner write), `chat-images` (private; signed URLs for room
participants only).

## Design patterns worth reading

1. **Category-specific fields without migrations** — `categories.field_template`
   (JSONB) declares each category's inputs (furniture dimensions, cosmetics
   expiry, car rego/odometer/service history); `listings.attributes` stores the
   values. Adding a category or field is a data change, not a schema change.
2. **Privacy by construction** — coordinates are fuzzed to a ~1.1 km grid
   *on-device*; the database never sees exact GPS (ADR-006).
3. **Authorization lives in the database** — every table has RLS; the client
   ships only the public anon key. Sensitive mutations (chat creation, bump,
   read-marking, view counts) go through `SECURITY DEFINER` RPCs that are
   executable by `authenticated` only, with pinned `search_path`.
4. **Server-computed trust** — review points and the quokka→kangaroo tier are
   computed in-DB (view + locked columns), so a client can't self-promote
   (ADR-008).
5. **Time is server time** — bump cooldowns and read-marking use server-time
   RPCs after an E2E-caught clock-skew bug (ADR-010).
6. **Search & alerts share one index** — a generated `tsvector` powers both
   user search and the keyword-alert matcher (Edge Function fan-out to Expo
   push).
7. **Full-fidelity E2E** — `scripts/e2e-journey.mjs` replays a 46-step journey
   against the live schema, including *negative* RLS cases (outsider reads
   chats, self-review, double offers) — run on every push in CI.

## Migration ledger

| # | File | What it adds |
|---|---|---|
| 001 | initial_schema | 10 core tables, RLS everywhere, PostGIS, FTS vector, profile auto-create trigger |
| 002 | seed_categories | 10 categories with trilingual labels + field templates |
| 003 | storage_listing_photos | photo bucket + policies |
| 004 | chat_rpc_realtime | `start_chat` RPC, Realtime publication for messages |
| 005 | keyword_alert_trigger | pg_net trigger → keyword-alert Edge Function |
| 006 | moderation | `reports`, `blocked_users` |
| 007 | storage_avatars | avatar bucket + policies |
| 008 | listing_approx_location | fuzzed lat/lng columns, suburb verification |
| 009 | category_taxonomy_v2 | 12-category re-order (+sports, +baby/kids) |
| 010 | favorite_counts_view | public ♥-count view |
| 011 | reviews_trust_meetups | `reviews`, trust points, `meetups` |
| 012–013 | meetups_* | Realtime for meetups; cancel releases reservation |
| 014 | start_chat_block_guard | blocked users can't open chats |
| 015–016 | listing_bump | bump column + server-time RPC |
| 017 | owner_sees_deleted | soft-delete visibility rule |
| 018 | chat_message_push | message push (recipient's language) |
| 019 | price_offers | `offers` state machine |
| 020 | view_counts | `increment_view` RPC |
| 021 | chat_images | private chat-images bucket |
| 022 | report_auto_hide | 3 reports auto-hide a listing |
| 023 | price_drop_trigger | price-drop push to favoriters |
| 024 | security_hardening | first advisor pass |
| 025 | mark_read_server_time | server-time read marking |
| 026 | payment_method | cash/transfer/any field |
| 027 | security_hardening | function EXECUTE lockdown, search_path pinning ([security.md](security.md)) |
| 028–029 | lock_trust_columns | column-level privileges on trust/verification fields |

## Related reading

- [security.md](security.md) — the full security architecture
- [data-model.md](data-model.md) — original ERD (design phase)
- [ADR index](adr/) — why each decision was made
