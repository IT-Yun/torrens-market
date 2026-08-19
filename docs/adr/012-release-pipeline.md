# ADR 012 — Release Pipeline (EAS Build / Submit / Update)

## Context
Store launch requires signed iOS/Android builds, submission automation, and a fast fix channel (`spec-store-launch`). Solo developer, free-tier budget, portfolio repo must stay reproducible for a reviewer.

## Options considered
- **(a) EAS Build + Submit + Update** — Expo-managed cloud signing/build/submit; OTA channel for JS
- **(b) Local builds (Xcode/Gradle) + manual store uploads** — free and unlimited, but manual credential care, no OTA, not CI-friendly
- **(c) Bare workflow + Fastlane CI** — maximum control; heavy setup and maintenance for one person

## Decision
**(a).** EAS free tier (15 iOS + 15 Android builds/month, EAS Update 1,000 MAU) with:
- `eas.json`: `development` / `preview` (internal distribution) / `production` profiles + `submit.production` (App Store Connect API key; Google Service Account JSON after the mandatory manual first .aab upload).
- Credentials held by EAS: iOS distribution cert/profile, Android upload keystore under mandatory Play App Signing (AAB).
- **Release policy**: JS/asset-only changes ship as **EAS Update (OTA)** — store-policy-compliant on both platforms; anything native (modules, permissions, icon, SDK upgrade) increments the runtime version and ships as a store build through TestFlight / Play tracks.
- Channels: `production` mapped to store builds; `preview` for TestFlight/closed-test builds.

## Why
1. Signing automation removes the classic solo-dev failure mode (lost keystores, expired profiles).
2. OTA gives a same-day fix channel during review-gated weeks — also our emergency lever in `spec-disaster-recovery`.
3. Free tier covers our cadence; local `eas build --local` remains an escape hatch if quota runs out.

## Consequences
- Add `eas.json` + EAS project id to the repo; document `eas build`/`submit`/`update` in README.
- Runtime-version discipline: bump on every native change or OTA will strand users.
- Build quota is a real constraint — batch native changes; prefer OTA for iteration.
