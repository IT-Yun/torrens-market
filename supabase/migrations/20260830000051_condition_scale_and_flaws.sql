-- ADR-020: five-level condition scale + dedicated flaw photos and a defect note.
alter table public.listings drop constraint if exists listings_condition_check;
alter table public.listings add constraint listings_condition_check
  check (condition in ('new', 'like_new', 'good', 'used', 'worn', 'defective'));
-- 'used' is legacy (display as 'good'); new writes use the five explicit levels.
alter table public.listings add column if not exists flaw_note text
  check (flaw_note is null or char_length(flaw_note) <= 500);
alter table public.listing_photos add column if not exists section text not null default 'main'
  check (section in ('main', 'flaw'));
create index if not exists listing_photos_listing_section_idx on public.listing_photos (listing_id, section, sort_order);
