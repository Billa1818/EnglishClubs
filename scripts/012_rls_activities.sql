-- PHASE 4 - RLS policies for activities

alter table public.activities enable row level security;

drop policy if exists "activities_select_active_members" on public.activities;
create policy "activities_select_active_members"
on public.activities
for select
to authenticated
using (public.is_active_member());

drop policy if exists "activities_insert_admin" on public.activities;
create policy "activities_insert_admin"
on public.activities
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "activities_update_admin" on public.activities;
create policy "activities_update_admin"
on public.activities
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "activities_delete_admin" on public.activities;
create policy "activities_delete_admin"
on public.activities
for delete
to authenticated
using (public.is_admin());
