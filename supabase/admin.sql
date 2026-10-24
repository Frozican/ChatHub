-- Run this separately in Supabase SQL Editor after the main schema.
-- This table is an allowlist: users cannot grant themselves admin access.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admins can read own allowlist entry" on public.admin_users;
create policy "admins can read own allowlist entry"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.admin_users from anon;
revoke insert, update, delete on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;

-- IMPORTANT:
-- 1. Register your normal ChatHub account first.
-- 2. Find its UUID in Supabase Dashboard > Authentication > Users.
-- 3. Replace YOUR_AUTH_USER_UUID below with that UUID and run only the INSERT.
-- Never add an admin-grant button to the public website.
-- insert into public.admin_users (user_id)
-- values ('YOUR_AUTH_USER_UUID')
-- on conflict (user_id) do nothing;
