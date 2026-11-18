-- Listing bump (ADR 010): once-per-24h re-surface to the top of the feed.
alter table public.listings
  add column if not exists bumped_at timestamptz,
  add column if not exists sort_ts timestamptz
    generated always as (greatest(created_at, coalesce(bumped_at, created_at))) stored;

create index if not exists listings_sort_ts_idx on public.listings (sort_ts desc);

create function public.enforce_bump_cooldown()
returns trigger
language plpgsql
as $$
begin
  if new.bumped_at is distinct from old.bumped_at and new.bumped_at is not null then
    if old.bumped_at is not null and new.bumped_at - old.bumped_at < interval '24 hours' then
      raise exception 'bump cooldown: once per 24 hours';
    end if;
    if new.bumped_at - old.created_at < interval '0 seconds' then
      raise exception 'invalid bump time';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_listing_bump_cooldown
  before update on public.listings
  for each row execute function public.enforce_bump_cooldown();
