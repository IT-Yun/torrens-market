-- Unstaffed-moderation guard: a listing reported by 3+ distinct users is
-- auto-hidden (soft delete). One report per (listing, reporter) so a
-- single account cannot trigger it alone.
create unique index if not exists one_report_per_listing_reporter
  on public.reports (listing_id, reporter_id)
  where listing_id is not null;

create function public.auto_hide_reported_listing()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.listing_id is not null then
    if (
      select count(distinct reporter_id)
      from public.reports
      where listing_id = new.listing_id
    ) >= 3 then
      update public.listings
      set status = 'deleted'
      where id = new.listing_id and status <> 'deleted';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_report_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported_listing();
