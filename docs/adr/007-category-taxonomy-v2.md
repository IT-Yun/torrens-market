---
name: adr-007-category-taxonomy-v2
description: Category taxonomy v2 — demand-ordered categories, Sports/Baby additions, Gumtree-style title-based category suggestion
type: adr
status: accepted
created: 2026-08-15
updated: 2026-08-15
---

# ADR 007 — Category Taxonomy v2

## Context
User feedback: category classification should be cleaner, benchmark-driven. Evidence: Gumtree ranks **Cars & Vehicles #1** in AU and **suggests categories from the listing title** while posting ([[benchmark-gumtree]]); Karrot orders browse chips by trade volume ([[benchmark-karrot]]); Facebook Marketplace's busiest AU categories include sports/outdoor gear and baby & kids items, both missing from our v1 list ([[spec-categories]]).

## Decision
1. **Demand-based ordering** for our segment (students/newcomers first, AU car culture close behind): Furniture, Electronics, Cars & bikes, Home & kitchen, Clothing, **Sports & outdoors (new)**, **Baby & kids (new)**, Luxury, Cosmetics, Books, Food, Other (12 total).
2. **Two new zero-field categories** — Sports & outdoors, Baby & kids. No custom fields at launch; fields can be added later if usage justifies.
3. **Title-based category suggestion** (Gumtree pattern): a trilingual keyword map (`src/lib/categorize.ts`) suggests a category as the seller types the title; one tap applies it. Suggestion only — never auto-assigns.

## Why
1. Order = shelf space: the categories people actually trade should be one thumb-reach away (Karrot/Gumtree evidence).
2. Missing high-volume categories push listings into "Other", which destroys filter value — the opposite of clean classification.
3. Suggestion at the point of typing reduces miscategorization without adding a taxonomy tree (Gumtree solves this with 3-level trees; a keyword map is the right size for 12 flat categories).

## Consequences
- Migration 009 reorders `sort_order` and inserts `sports`, `baby_kids` (idempotent on slug).
- Keyword map is heuristic and trilingual; it will need tuning from real listing data — pure function with unit tests so tuning is cheap.
- [[spec-categories]] updated to v2 (12 categories).
