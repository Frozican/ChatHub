-- ChatHub social/server-join migration. Run after supabase/schema.sql.
-- Only the recipient of a pending request may accept it.
drop policy if exists "accept incoming friend request" on public.friendships;
create policy "accept incoming friend request"
on public.friendships for update to authenticated
using (addressee_id = (select auth.uid()) and status = 'pending')
with check (addressee_id = (select auth.uid()) and status = 'accepted');

-- Profile display names are searchable using the existing authenticated read policy.
