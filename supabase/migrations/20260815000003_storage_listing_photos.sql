-- Storage bucket for listing photos (public read, authenticated upload)

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "public read listing photos"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "authenticated users upload listing photos"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.uid() is not null);

create policy "owners delete own listing photos"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and owner = auth.uid());
