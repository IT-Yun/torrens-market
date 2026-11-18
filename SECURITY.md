# Security Policy

Torrens Market is an open-source, portfolio-grade secondhand-marketplace app. Security is a first-class concern: **all authorization is enforced in the database (PostgreSQL Row-Level Security), never in the client.** The mobile bundle and the public anon key are assumed hostile by design.

## Reporting a vulnerability

If you believe you have found a security vulnerability, please **do not open a public issue.** Instead email the maintainer with:

- a description of the issue and its impact,
- steps to reproduce (a proof-of-concept request is ideal),
- the affected component (RLS policy, Edge Function, Storage bucket, mobile client, CI).

You can expect an acknowledgement within a few days. Please allow reasonable time for a fix before any public disclosure. There is no bug-bounty program, but genuine reports will be credited in the changelog if you wish.

## Supported versions

Only the latest released version on the `main` branch (and the current store build) is supported. Fixes ship via a new store build or an over-the-air (EAS Update) patch for JS-level issues.

## Our security model (what a reviewer should know)

- **Authorization = RLS.** Every table in the `public` schema has Row-Level Security enabled. Cross-tenant isolation is proven by an attack-simulation suite (cross-tenant reads/writes, BOLA, mass-assignment) — see the project wiki's security-hardening spec.
- **No secrets in the client.** The app ships only the public Supabase URL + anon key, which are safe *only because* RLS is the real gate. The `service_role` key and all third-party secrets live in server-side environment variables (Edge Function secrets / EAS secrets), never in the repo or the bundle.
- **Trust badges are server-managed.** Phone-verification status is set only by a server-side flow and cannot be self-assigned by clients (enforced by column-level privileges + a guard trigger).
- **Location privacy.** Listing coordinates are rounded to a ~1.1 km grid on-device before upload; exact GPS never leaves the device.
- **Supply chain.** Secret scanning (gitleaks), dependency auditing (`npm audit`, Dependabot), and static analysis (CodeQL) run in CI.

## Scope

In scope: this repository's application code, database migrations/policies, Edge Functions, and CI configuration. Out of scope: the Supabase and Expo platforms themselves (report those to the respective vendors), and social-engineering or physical attacks.
