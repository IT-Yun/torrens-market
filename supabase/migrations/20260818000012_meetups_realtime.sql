-- Live meetup-card updates: include meetups in the Realtime publication
-- (RLS still gates who receives each row's changes).
alter publication supabase_realtime add table public.meetups;
