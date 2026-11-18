---
name: adr-006-approximate-location-distance
description: Listings store only a ~1.1km-fuzzed coordinate; buyers see distance + rough travel time computed on-device
type: adr
status: accepted
created: 2026-08-15
updated: 2026-08-15
---

# ADR 006 — Approximate Location + Distance/Travel-time Estimate

## Context
[[core-context]] names solid location handling as a differentiator: real trades depend on pickup logistics. Karrot shows listing distance from the buyer while only ever exposing neighbourhood-level seller location ([[benchmark-karrot]]). Exact seller coordinates are a safety/PII hazard (user requirement 2026-08-15: "record only the approximate location"). Buyers asked: "how far / how long to get there?"

## Options considered
- **(a) Exact GPS stored, fuzzed on display** — precise data at rest is still a breach/PII risk; violates the no-PII vault/repo posture
- **(b) Coordinates fuzzed at capture (~1.1km grid), distance computed on-device** — exact location never leaves the phone; haversine + speed heuristic needs no API
- **(c) External routing API (Google Directions) for true travel time** — accurate but costs money, adds a key to manage, overkill for "rough" expectations

## Decision
**(b).** At listing creation the app requests foreground location once, rounds lat/lng to **2 decimal places (~1.1 km grid)**, and stores only that (`listings.lat/lng`, nullable — denied permission just skips it). The viewer's device computes haversine distance to their own current location and shows "~X km · ~N min walk/drive" (walk ≤ 2 km at 4.5 km/h, else drive at 30 km/h urban + 2 min buffer). Viewer location is never uploaded.

## Why
1. Privacy by construction: precise coordinates are never persisted anywhere, matching Karrot's neighbourhood-level disclosure.
2. Zero external dependencies or per-request cost; estimates are honest about being estimates ("~").
3. Fuzzed columns are plain `double precision` — PostGIS geography stays reserved for future server-side radius search without client WKB parsing.

## Addendum — Suburb verification (same day)
User also asked for a Karrot-style neighbourhood check: when setting a profile suburb, the app offers "verify with my location" — the device reverse-geocodes its own position (platform geocoder, no API key) and leniently compares it with the chosen suburb. Match sets `profiles.suburb_verified_at` and shows a small pin badge; mismatch suggests the detected suburb instead. Self-attested at MVP scale (client writes the flag) — acceptable for now, server-side attestation is a future hardening step. Extends the badge mechanism from [[adr-002-auth-strategy]].

## Consequences
- Migration 008 adds nullable `lat`/`lng` to `listings`; `expo-location` dependency added.
- Pure helpers (`fuzzCoord`, `haversineKm`, `travelEstimate`) live in `src/lib/geo.ts` with unit tests.
- Distance row renders only when both listing coords and device permission exist — graceful absence otherwise.
- Future: server-side "within X km" filter can reuse the same fuzzed coords via PostGIS.
