-- Per-user notification preferences (Sean's request 2026-08-20).
-- One JSONB column, all types default ON so existing users' behaviour is
-- unchanged until they touch the settings screen. The notify Edge Functions
-- read this and skip a push when the recipient turned that type off.

alter table public.profiles
  add column notification_prefs jsonb not null default
    '{"keyword_alerts": true, "chat": true, "offers": true, "meetups": true, "price_drops": true}'::jsonb;

-- profiles is column-locked (migration 029); let the owner edit their prefs.
grant update (notification_prefs) on public.profiles to authenticated;
