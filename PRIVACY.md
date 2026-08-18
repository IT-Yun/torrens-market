# Torrens Market — Privacy Policy

_Last updated: 18 August 2026_

Torrens Market ("the app") is a local secondhand marketplace for Adelaide, South Australia. This policy describes what data the app collects, why, and how you can remove it.

## What we collect

| Data | Purpose | Notes |
|---|---|---|
| Email address | Sign-in (one-time code) and account identity | Never shown to other users |
| Display name, profile photo, suburb, nationality (optional) | Your public marketplace profile | Nationality is optional and self-declared |
| Listing content (photos, title, description, price, category details) | Publishing your listings | Public to all users |
| Approximate listing location | Distance display for buyers | Coordinates are **rounded to a ~1.1 km grid on your device before upload**; your exact GPS position never leaves your phone |
| Suburb verification result | The suburb-verified badge | Only a yes/no timestamp is stored — never your coordinates |
| Chat messages and chat photos | Buyer–seller conversations | Visible only to the two participants; chat photos live in a private bucket |
| Meetup proposals and price offers | In-chat deal-making | Visible only to the two participants |
| Reviews and ratings | The public trust-tier system | Reviews you receive are public on your profile |
| Push notification token | Delivering alerts you opted into | Removable by disabling notifications |
| Reports and blocks | Community safety | Reports are not visible to the reported user |

## What we do not collect

No advertising identifiers, no analytics SDKs, no contact-list access, no background location, no payment details (trades are settled in person between users).

## Where data lives

Data is stored with Supabase (managed Postgres) in the `ap-southeast-2` (Sydney, Australia) region. Access is enforced by row-level security: chat, meetups, offers, and favorites are readable only by their participants/owners.

## Sharing

We do not sell or share personal data with third parties. Push notifications are delivered through Expo's push service (message title/body transit only).

## Deleting your data

**Profile → Settings → Delete account** permanently removes your account, profile, listings, photos, chats, offers, meetups, and reviews. This is immediate and irreversible.

## Contact

Questions or requests: open an issue at [github.com/IT-Yun/torrens-market](https://github.com/IT-Yun/torrens-market) or email the maintainer.
