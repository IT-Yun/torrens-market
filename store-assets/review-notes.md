# App Store Connect — Review Notes (draft)

Paste into ASC "App Review Information → Notes" at submission. Keep under
4000 chars. `[DEMO-*]` placeholders are filled in when the demo account is
created (DB-lane task).

---

Torrens Market is a free local secondhand marketplace for Adelaide, South
Australia, with a fully trilingual UI (English / Korean / Chinese).

DEMO ACCOUNT
- Email: [DEMO-EMAIL]
- A fixed one-time code is configured for this reviewer account: [DEMO-OTP]
  (enter it on the code screen — no email access needed).
- The account is pre-seeded with realistic listings, an active chat with a
  price offer and a scheduled meetup, favorites, and keyword alerts, so all
  features are visible immediately.

KEY FLOWS TO TEST
1. Language: the first screen selects English / 한국어 / 中文; every screen
   switches live (also from Profile → Language).
2. Browse & search: Home feed → category chips → distance scope (my suburb /
   5–20 km / all). Search supports keyword + filters (category, nationality,
   verified sellers, max price).
3. Post a listing: + button → photos → choosing a category reveals
   category-specific fields (e.g. Furniture → dimensions; Cosmetics → expiry
   date). First post shows our Terms of Service acceptance gate.
4. Deal-making: open a listing → Chat → send a message; the chat hosts price
   offers and pickup-meetup scheduling (accepting a meetup reserves the
   listing).
5. UGC safety (guideline 1.2): every listing has ⋯ → Report (reason picker)
   and Block seller. Blocking hides the seller's listings and prevents new
   chats both ways. Three distinct reports auto-hide a listing pending
   review. Profile → Settings → Blocked users manages the block list.
6. Account deletion (5.1.1(v)): Profile → Settings → Delete account —
   immediate, cascades all user data.

LOCATION USE
When-in-use only, for showing nearby listings and verifying the user's
suburb. Coordinates are rounded to a ~1.1 km grid ON DEVICE before upload —
exact GPS never reaches our servers. No background location.

PRIVACY / TRACKING
No ads, no analytics SDKs, no tracking across apps (no ATT prompt needed).
Privacy policy: https://it-yun.github.io/torrens-market/privacy.html
Support: https://it-yun.github.io/torrens-market/support.html

NOTES
- Payments are settled in person between users; the app processes no
  payments (no IAP).
- Sign in with Apple and Google are offered alongside email one-time codes.
- The marketplace is seeded with genuine-looking demo listings for review;
  real inventory grows post-launch in Adelaide.

Thank you for reviewing!
