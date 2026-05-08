-- PHASE 5 - RLS policies for sessions domain

alter table public.sessions enable row level security;
alter table public.session_activities enable row level security;
alter table public.session_activity_assignments enable row level security;

-- sessions

drop policy if exists "sessions_select_active_members" on public.sessions;
create policy "sessions_select_active_members"
on public.sessions
for select
to authenticated
using (public.is_active_member());

drop policy if exists "sessions_insert_admin" on public.sessions;
create policy "sessions_insert_admin"
on public.sessions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "sessions_update_admin" on public.sessions;
create policy "sessions_update_admin"
on public.sessions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sessions_delete_admin" on public.sessions;
create policy "sessions_delete_admin"
on public.sessions
for delete
to authenticated
using (public.is_admin());

-- session_activities

drop policy if exists "session_activities_select_active_members" on public.session_activities;
create policy "session_activities_select_active_members"
on public.session_activities
for select
to authenticated
using (public.is_active_member());

drop policy if exists "session_activities_insert_admin" on public.session_activities;
create policy "session_activities_insert_admin"
on public.session_activities
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "session_activities_update_admin" on public.session_activities;
create policy "session_activities_update_admin"
on public.session_activities
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "session_activities_delete_admin" on public.session_activities;
create policy "session_activities_delete_admin"
on public.session_activities
for delete
to authenticated
using (public.is_admin());

-- session_activity_assignments

drop policy if exists "session_activity_assignments_select_active_members" on public.session_activity_assignments;
create policy "session_activity_assignments_select_active_members"
on public.session_activity_assignments
for select
to authenticated
using (public.is_active_member());

drop policy if exists "session_activity_assignments_insert_admin" on public.session_activity_assignments;
create policy "session_activity_assignments_insert_admin"
on public.session_activity_assignments
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "session_activity_assignments_update_admin" on public.session_activity_assignments;
create policy "session_activity_assignments_update_admin"
on public.session_activity_assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "session_activity_assignments_delete_admin" on public.session_activity_assignments;
create policy "session_activity_assignments_delete_admin"
on public.session_activity_assignments
for delete
to authenticated
using (public.is_admin());
