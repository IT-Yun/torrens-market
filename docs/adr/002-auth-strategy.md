# ADR 002 — Auth Strategy: Social Login + Phone-verification Badge

## Context
`core-context` requires verified accounts for trust, but a brand-new marketplace's biggest enemy is sign-up friction. Karrot mandates phone/neighborhood verification (`benchmark-karrot`); Gumtree has effectively none (`benchmark-gumtree`) and suffers scam reputation. SMS OTP costs real money per message (e.g. Twilio ~$0.05/msg).

## Options considered
- **(a) Mandatory phone SMS verification** — strongest trust; highest friction + per-signup cost; overseas-number edge cases
- **(b) Email verification only** — free; weak (disposable emails → multi-accounts)
- **(c) Social login (Google/Apple) + optional phone verification as a profile badge** — minimal friction; trust becomes a visible, filterable signal

## Decision
**(c).** Sign-up via Google/Apple social login. Phone verification is optional and grants a **✓ Verified badge** on the profile; browse/search gains a "verified sellers only" filter. Apple Sign-In included (App Store requires it when any social login is offered).

## Why
1. Zero-friction onboarding protects early growth when the app has no users yet.
2. Reinterprets Karrot's trust model at solo-dev scale: trust as badge + filter, not a gate.
3. SMS cost is incurred only by users who opt into verification.

## Consequences
- Profile model needs `is_phone_verified` flag; search needs a verified-only filter.
- SMS provider integration (e.g. Twilio) required but low-volume.
- Nationality field is self-declared at sign-up (not verified) — consistent with the filter-not-matching design in `spec-mvp`.
- Future: additional badges (e.g. student email verification) can reuse the badge mechanism.
