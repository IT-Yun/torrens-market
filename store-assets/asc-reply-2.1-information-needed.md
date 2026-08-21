# ASC Reply — Guideline 2.1 Information Needed (Submission a8f6efbd, 2026-08-21)

Apple rejected 1.0.0 (5) with **2.1.0 Performance: App Completeness — Information
Needed**. This is an information request, not a functionality rejection. Reply in
App Store Connect → App Review → Messages with the text below + the screen
recording attached, then **Resubmit to App Review with BUILD 6** (2026-08-21
strategy change: build 6 bakes the day's 12 fix commits natively so a reviewer's
fresh-install first launch — which runs the embedded bundle, not OTA — already
has the profile-scroll fix, crash fix, and all UX work; build 5's embedded
bundle predates them).

---

## Step 1 — Screen recording (Sean, physical iPhone, ~3–5 min)

Record with iOS screen recording (Control Center) on your real device running
**build 6** (TestFlight — install when it appears; no restart dance needed, the
embedded bundle is current). One continuous take, this order:

1. Launch the app from the home screen (recording must start here).
2. Language select screen → pick English.
3. **Sign in with Apple** (fresh sign-up flow if possible).
4. Location permission prompt → allow → home feed with nearby listings,
   category chips, distance scope.
5. Search with a keyword + a filter.
6. Post a listing: + button → **camera/photo permission prompt** → photos →
   pick Furniture (shows dimension fields) → publish (ToS gate on first post).
7. Open another listing → chat → send a message → make a price offer →
   schedule a meetup.
8. UGC safety: listing ⋯ → **Report** (reason picker) and **Block seller**;
   Profile → Settings → Blocked users.
9. Switch language to 한국어 briefly (shows trilingual UI).
10. Profile → Settings → **Delete account** → confirm (use a throwaway/demo
    account for this take, or end the recording at the confirmation dialog).

No purchases/subscriptions and no ATT prompt exist — nothing to show there.
Attach the video file directly to the ASC message reply (compress/AirDrop to
Mac; if too large, trim to under ~500MB or host and link).

## Step 2 — Paste this reply into ASC Messages

---

Hello, thank you for the review. Please find the requested information below.

**1. Screen recording**
Attached is a screen recording captured on a physical iPhone 17 Pro running
iOS 26.6, demonstrating: app launch, Sign in with
Apple registration, location permission prompt, browsing/search, posting a
listing (camera/photos permission prompts), in-chat price offer and meetup
scheduling, user-generated-content reporting and blocking, and account
deletion. The app has no paid content, purchases, or subscriptions, and no App
Tracking Transparency prompt (no tracking).

**2. Devices and OS tested**
- iPhone 17 Pro, iOS 26.6 — physical device (TestFlight
  builds 3–5): full end-to-end testing including Sign in with Apple, Google
  sign-in, push notifications, and location features.
- iOS Simulator (Xcode 16): iPhone 16 Pro Max and additional screen sizes —
  46-step end-to-end UI test pass in all three languages (English, Korean,
  Chinese) on build 5.

**3. App functions and target audience**
Torrens Market is a free local secondhand marketplace for Adelaide, South
Australia. Users (16+) list used items with photos, browse/search nearby
listings, chat, agree on a price, and meet in person to complete the trade.
The problem it solves: Adelaide's large international community (Korean- and
Chinese-speaking students and migrants) is underserved by English-only
marketplaces, so the entire product is trilingual (English/Korean/Chinese)
with local-trust features (suburb verification, verified-seller badge,
post-trade reviews). The app processes no payments; trades settle in person.

**4. Setup and access instructions**
No demo credentials are required. On the login screen tap "Continue with
Apple" (Sign in with Apple) — the reviewer's own Apple ID creates an account
immediately. The marketplace is pre-seeded with sample listings, so a fresh
account sees a populated feed at once. Main features: Home feed (browse/
filters), magnifier (search), + (post a listing), chat tab (offers + meetup
scheduling), Profile → Settings (language, blocked users, delete account).
Email one-time-code login also exists as an alternative; Sign in with Apple
is the recommended review path.

**5. External services used**
- Supabase (hosted): authentication, Postgres database, file storage, and
  edge functions — the entire backend.
- Sign in with Apple and Google Sign-In: federated login only.
- Expo / EAS (expo.dev): build pipeline, over-the-air JS updates, and Expo
  Push Notification service (APNs delivery).
- GitHub Pages: static hosting for the privacy policy and support pages.
No payment processors, no ads networks, no analytics SDKs, and no AI
services are used.

**6. Regional differences**
None — the app functions identically in all regions. The UI language
(English/Korean/Chinese) is a user choice, independent of region. Listing
content is naturally concentrated in Adelaide, Australia, where the service
launches.

**7. Regulated industry / third-party material**
Not applicable. Torrens Market is a consumer-to-consumer secondhand
marketplace; it processes no payments, offers no financial/medical/gambling
services, and contains no protected third-party material. All app content is
user-generated, with reporting, blocking, and auto-hide moderation built in
(demonstrated in the recording).

We have also added this information to the App Review Information → Notes
field for future submissions. Thank you!

---

## Step 3 — Also update ASC Notes field

Append items 2–7 above to App Store Connect → App Review Information → Notes
(Apple explicitly asked for this "for future submissions").

## Step 4 — Resubmit

After replying with the attachment: in the version's build section, REMOVE
build 5 and SELECT **build 6** (a rejected submission accepts a build swap),
then **Resubmit to App Review**. Build 6 also bakes the former 1.0.1 items
(home-screen label "Torrens", encryption-exempt flag — the export-compliance
question no longer appears).
