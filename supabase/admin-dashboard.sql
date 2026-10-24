-- ChatHub private admin dashboard RPCs.
-- Run this file in Supabase SQL Editor after admin_users exists and your user ID is allowlisted.
-- These SECURITY DEFINER functions check the allowlist on every call. Never put a service_role key in GitHub Pages.

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'servers', (select count(*) from public.servers),
    'messages', (select count(*) from public.messages),
    'channels', (select count(*) from public.channels)
  );
end;
$$;

create or replace function public.admin_list_users()
returns table (id uuid, display_name text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  return query
    select p.id, p.display_name, p.created_at
    from public.profiles p
    order by p.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_list_messages()
returns table (id uuid, content text, author text, channel text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  return query
    select m.id, m.content, coalesce(p.display_name, 'Unknown'), c.name, m.created_at
    from public.messages m
    left join public.profiles p on p.id = m.user_id
    left join public.channels c on c.id = m.channel_id
    order by m.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_delete_message(target_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  delete from public.messages where id = target_message_id;
  return found;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_list_messages() from public, anon;
revoke all on function public.admin_delete_message(uuid) from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_messages() to authenticated;
grant execute on function public.admin_delete_message(uuid) to authenticated;
