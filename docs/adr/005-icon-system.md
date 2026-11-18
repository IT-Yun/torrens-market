---
name: adr-005-icon-system
description: Replace ad-hoc emoji icons with Lucide (lucide-react-native) as the app-wide icon system
type: adr
status: accepted
created: 2026-08-15
updated: 2026-08-15
---

# ADR 005 — Icon System: Lucide

## Context
The app shipped its first UI passes using raw emoji as icons (📦🔍❤💬👤 across tabs, search, listings, profile). Emoji render inconsistently across platforms/OS versions, clash with the brand palette, and read as placeholder quality. Benchmark apps use disciplined icon systems: Karrot uses a consistent rounded-outline stroke set with filled variants for active tab states ([[benchmark-karrot]]); Bunjang similarly uses a single-weight line set ([[benchmark-bunjang]]). Icon *style* is benchmarkable; icon *assets* must not be copied (see CLAUDE.md inspiration-vs-plagiarism rule).

## Options considered
- **(a) lucide-react-native** — 1500+ MIT-licensed icons, single consistent 24px/2px-stroke grid, tree-shakable per-icon imports, configurable stroke width/fill, active community (Feather successor)
- **(b) @expo/vector-icons (Ionicons et al.)** — bundled with Expo, zero setup, but mixes several families with inconsistent metrics; font-based (whole font ships)
- **(c) Custom SVG set** — maximal brand control; days of design work, inconsistent quality risk for a solo dev

## Decision
**(a) lucide-react-native** (+ `react-native-svg` peer). Conventions:
- Default stroke width 2, sized via a small `Icon`-usage convention (18–24px inline, 24px tabs)
- Active tab state = primary color (+ fill for Heart), inactive = muted gray — Karrot's filled-active pattern reinterpreted
- No emoji as UI glyphs anywhere in app chrome; emoji stay allowed inside user content only

## Why
1. Matches the benchmark aesthetic (Karrot/Bunjang line-icon discipline) without copying their assets — MIT license, portfolio-safe.
2. Tree-shakable SVG imports keep the bundle lean vs font-based sets.
3. One metric grid ends the mixed-size emoji look; stroke/fill props cover active states without a second asset set.

## Consequences
- Adds `react-native-svg` native dependency (Expo-managed, config-plugin free).
- All emoji glyphs in `app/` and `src/components/` replaced with Lucide equivalents in one sweep.
- Future custom brand icons (e.g. category glyphs) should be drawn on the same 24px/2px-stroke grid to blend in.
