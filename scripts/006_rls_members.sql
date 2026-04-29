-- Phase 1 - RLS policies for members

alter table public.members enable row level security;

drop policy if exists "members_select_self" on public.members;
create policy "members_select_self"
on public.members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "members_select_active_members" on public.members;
create policy "members_select_active_members"
on public.members
for select
to authenticated
using (public.is_active_member());

drop policy if exists "members_insert_admin" on public.members;
create policy "members_insert_admin"
on public.members
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "members_update_admin" on public.members;
create policy "members_update_admin"
on public.members
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "members_delete_admin" on public.members;
create policy "members_delete_admin"
on public.members
for delete
to authenticated
using (public.is_admin());
