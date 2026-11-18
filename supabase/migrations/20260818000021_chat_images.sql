-- Storage bucket for chat images (messages.image_path existed unused).
-- Read limited to room participants via a path convention: <room_id>/<file>.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

create policy "participants read chat images"
  on storage.objects for select
  using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.chat_participants p
      where p.user_id = auth.uid()
        and p.room_id::text = (storage.foldername(name))[1]
    )
  );

create policy "participants upload chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.chat_participants p
      where p.user_id = auth.uid()
        and p.room_id::text = (storage.foldername(name))[1]
    )
  );
