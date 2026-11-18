-- ADR-020 amendment (Sean: "중고이고 하자 있다" must be expressible):
-- condition stays a single level (new / like_new / good / worn); "has flaws"
-- becomes an orthogonal boolean so any level can combine with disclosed flaws.
alter table public.listings add column if not exists has_flaws boolean not null default false;
-- backfill: anything filed as the old 'defective' level → worn + has_flaws
update public.listings set has_flaws = true, condition = 'worn' where condition = 'defective';
-- keep 'defective' accepted for safety (older clients), app no longer writes it
create index if not exists listings_has_flaws_idx on public.listings (has_flaws) where has_flaws;
