# ADR 013 — Phone Verification Flow (trust badge)

## Context
`002-auth-strategy` decided login (email OTP / social) stays separate from an **optional phone verification that earns a profile badge** — the Karrot trust pattern and our main scam deterrent. Today `profiles.is_phone_verified` + BadgeCheck UI exist everywhere (profile, listing detail, public profile) but **no flow can set the flag** — verification is unimplemented. SMS is also our single biggest cost-attack surface (SMS pumping) — see `spec-abuse-cost-defense` — so defenses are part of the design, not an afterthought.

## Decision (flow — accepted in principle; provider choice pending research)
1. Opt-in screen from profile: enter AU mobile (+61 4xx) → 6-digit SMS code → `is_phone_verified = true` + `phone_verified_at`. Phone number stored hashed/last-3-shown, never public.
2. **Separate from Supabase Auth login** — we call the SMS provider from an Edge Function and verify server-side, so login never depends on SMS and the badge can't be spoofed by client code (definer RPC sets the flag).
3. One phone number = one account badge (unique hash constraint) — recycled-number takeovers just move the badge.

## Abuse defenses (required before this ships)
- **AU-only allow-list** (+61 mobile prefixes) at the Edge Function — kills international SMS-pumping ranges outright.
- Rate limits in Postgres: per-user (3 sends/hour, 10/day), per-phone (5/day), per-IP burst cap; cooldown between resends; code expiry 10 min, 5 attempts.
- CAPTCHA (Turnstile) gate before the first send.
- **Provider (decided 2026-08-19, research in `spec-abuse-cost-defense` §1): Twilio Verify** — $0.05/successful verification + AU carrier fee (~$5–6/mo at ~100 SMS/mo). Uniquely bundles free **Fraud Guard (Standard tier)** with a missed-fraud money-back guarantee, console **geo-permissions locked to +61**, and first-class Supabase integration. Twilio usage alert at ~$20/mo as backstop; WhatsApp OTP kept as pumping-resistant fallback channel.

## Consequences
- Migration: `phone_hash unique`, `phone_verified_at`, rate-limit table; Edge Function `phone-verify` (send/check); profile screen entry point.
- Cost: SMS to AU ≈ US$0.04–0.05/message — badge opt-in volume is small; caps bound worst case.
- The badge finally means something: listings from verified sellers can be filtered/ranked later (`008-trust-tiers` input).
