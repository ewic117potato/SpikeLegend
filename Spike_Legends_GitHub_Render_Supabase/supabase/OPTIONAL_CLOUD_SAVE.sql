-- Optional cloud saving for GitHub -> Render -> Supabase setup.
-- In Supabase: Authentication > Providers > Anonymous Sign-Ins -> Enable.
-- Run this script in SQL Editor. No secret keys belong in GitHub.

create table if not exists public.volleyball_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint volleyball_saves_payload_limit check (jsonb_typeof(payload)='object' and octet_length(payload::text)<500000)
);
alter table public.volleyball_saves enable row level security;

drop policy if exists volleyball_save_select on public.volleyball_saves;
create policy volleyball_save_select on public.volleyball_saves
  for select to authenticated using ((select auth.uid())=user_id);

drop policy if exists volleyball_save_insert on public.volleyball_saves;
create policy volleyball_save_insert on public.volleyball_saves
  for insert to authenticated with check ((select auth.uid())=user_id);

drop policy if exists volleyball_save_update on public.volleyball_saves;
create policy volleyball_save_update on public.volleyball_saves
  for update to authenticated using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id);

revoke all on public.volleyball_saves from anon;
grant select, insert, update on public.volleyball_saves to authenticated;
