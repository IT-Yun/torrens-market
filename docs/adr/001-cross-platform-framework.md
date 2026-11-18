# ADR 001 — Cross-platform Framework: React Native + Expo + TypeScript

## Context
The app must ship on **Android and iOS simultaneously**, solo-built, with a likely **web version later**. Trilingual UI (KO/EN/ZH) is the #1 product requirement, and the codebase doubles as a **job-hunting portfolio** targeting the Australian market. See `source-service-dev-process` (the roadmap whiteboard listed React Native as a candidate) and `core-context`.

## Options considered
- **React Native (+ Expo)** — JS/TS ecosystem; natural path to web (React / Expo Web / shared code with Next.js); broadest job-market demand
- **Flutter** — easy setup, consistent UI, good i18n; but web build is canvas-rendered → weak SEO, and Dart has narrower job-market value
- **Native ×2 (Kotlin + Swift)** — best platform fidelity; double the work, unrealistic for a solo MVP

## Decision
**React Native with Expo, in TypeScript.**

## Why
1. **Web expansion path** — a marketplace benefits hugely from Google-indexable listing pages; the React ecosystem (RN Web / Next.js) covers this, Flutter web does not (canvas rendering, poor SEO).
2. **Portfolio leverage** — React/TypeScript has the widest demand in the Australian job market; one project demonstrates mobile + web + TS.
3. **i18n** — mature ecosystem (i18next / react-intl) handles KO/EN/ZH switching cleanly.
4. **Solo-dev velocity** — Expo simplifies builds, OTA updates, and App Store / Play Store submission.

## Consequences
- Language/runtime: TypeScript everywhere; backend can share types (e.g. Node) — backend choice is a separate future ADR.
- i18n library selection (i18next vs react-intl) → future ADR when Stage 2 design starts.
- Commits us to the React ecosystem for the web version.
