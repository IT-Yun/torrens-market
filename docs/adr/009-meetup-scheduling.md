---
name: adr-009-meetup-scheduling
description: One active meetup per chat room (propose/accept/decline/cancel) with push on state change and a pg_cron 1-hour reminder
type: adr
status: accepted
created: 2026-08-18
updated: 2026-08-18
---

# ADR 009 — Meetup Scheduling in Chat

## Context
[[spec-reviews-trust]]: the real failure mode of local pickup is the vague "see you around 5?" buried in chat history. The agreement (time + place) needs structure, visibility, and notifications. Push infrastructure already exists ([[adr-004-keyword-alert-architecture]]: pg_net trigger → Edge Function → Expo push).

## Options considered
- **(a) Meetup as a special message type** — renders inline in history but state changes (accept/cancel) would mutate past messages; awkward
- **(b) Dedicated `meetups` table, one active per room, rendered as a pinned card** — clean state machine, trivially queryable for reminders
- **(c) External calendar integration (ICS/Google)** — over-engineered for MVP

## Decision
**(b).** `meetups(id, room_id, proposer_id, scheduled_at, place, status, reminder_sent)` with status machine `proposed → accepted | declined`, either side may `cancelled`; a new proposal is allowed when none is `proposed/accepted`. Chat room pins the current meetup as a card with contextual actions (accept/decline for the counterparty, cancel for both).
- **Notifications**: DB trigger on insert/status-change → pg_net → existing Edge Function pattern → Expo push to the other participant.
- **Reminder**: pg_cron sweep (every 10 min) pushes to both participants ~1 h before an `accepted` meetup (`reminder_sent` guard).
- Accepting a meetup sets the listing to `reserved` (seller-side effect via the same trigger, guarded).

## Why
1. A single active meetup per room mirrors reality (one deal, one appointment) and keeps the UI to one pinned card.
2. Reuses the proven alert pipeline — no new infrastructure, one more trigger + function.
3. pg_cron is the only new moving part and stays entirely server-side.

## Consequences
- Migration: `meetups` + RLS (participants only), notify trigger, pg_cron schedule.
- Edge Function `meetup-notify` (proposal/response/reminder payloads, trilingual bodies).
- Chat room UI: calendar action + pinned meetup card; date picking via `@react-native-community/datetimepicker` (Expo-bundled).
- Review flow unlocks after meetup acceptance ([[adr-008-trust-tiers]] "leaves active" rule — reserved counts).
