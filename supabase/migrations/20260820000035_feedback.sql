-- In-app bug / feedback reporting (Sean's request 2026-08-20).
-- Users submit a short report; the developer reads them via the Supabase
-- dashboard (or a future admin view). Kept minimal and RLS-scoped.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null default 'bug' check (kind in ('bug', 'suggestion', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  app_version text,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);

alter table public.feedback enable row level security;

-- A signed-in user can file feedback as themselves and read their own history.
create policy "users submit own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);
create policy "users read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- Column-locked like the rest of the schema: clients set only these.
revoke all on public.feedback from anon, authenticated;
grant insert (user_id, kind, message, app_version) on public.feedback to authenticated;
grant select on public.feedback to authenticated; -- RLS still scopes to own rows
