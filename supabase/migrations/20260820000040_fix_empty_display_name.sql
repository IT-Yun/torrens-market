-- Fix: migration 037 made email signups default display_name to '' (empty) so
-- users fill it in onboarding, but the profiles check still required length >= 1,
-- which made handle_new_user (and therefore email signup itself) fail with a 500.
-- Allow an empty display_name (it's transient until onboarding sets it; the
-- create-listing flow and onboarding both require a real name before anything
-- meaningful happens). Keep the 40-char ceiling.
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles
  add constraint profiles_display_name_check check (char_length(display_name) <= 40);
