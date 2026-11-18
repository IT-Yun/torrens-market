-- ADR 014: listing-level payment method (cash only / bank transfer / any),
-- orthogonal to pickup_mode. Default 'any' keeps existing rows valid.
alter table public.listings
  add column payment_method text not null default 'any'
  check (payment_method in ('any', 'cash_only', 'bank_transfer'));
