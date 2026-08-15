-- Approximate (privacy-fuzzed, ~1.1km grid) listing coordinates.
-- Exact GPS is rounded on-device before upload; see ADR 006.
alter table public.listings
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Karrot-style neighbourhood check: set when the device's reverse-geocoded
-- position roughly matched the chosen suburb (self-attested at MVP scale).
alter table public.profiles
  add column if not exists suburb_verified_at timestamptz;
