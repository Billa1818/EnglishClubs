-- PHASE 8 - RLS policies for selection domain

alter table public.activity_selection_cycles enable row level security;
alter table public.activity_selections enable row level security;

-- activity_selection_cycles

drop policy if exists "activity_selection_cycles_select_active_members" on public.activity_selection_cycles;
create policy "activity_selection_cycles_select_active_members"
on public.activity_selection_cycles
for select
to authenticated
using (public.is_active_member());

drop policy if exists "activity_selection_cycles_insert_admin" on public.activity_selection_cycles;
create policy "activity_selection_cycles_insert_admin"
on public.activity_selection_cycles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "activity_selection_cycles_update_admin" on public.activity_selection_cycles;
create policy "activity_selection_cycles_update_admin"
on public.activity_selection_cycles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "activity_selection_cycles_delete_admin" on public.activity_selection_cycles;
create policy "activity_selection_cycles_delete_admin"
on public.activity_selection_cycles
for delete
to authenticated
using (public.is_admin());

-- activity_selections

drop policy if exists "activity_selections_select_active_members" on public.activity_selections;
create policy "activity_selections_select_active_members"
on public.activity_selections
for select
to authenticated
using (public.is_active_member());

drop policy if exists "activity_selections_insert_admin" on public.activity_selections;
create policy "activity_selections_insert_admin"
on public.activity_selections
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "activity_selections_update_admin" on public.activity_selections;
create policy "activity_selections_update_admin"
on public.activity_selections
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "activity_selections_delete_admin" on public.activity_selections;
create policy "activity_selections_delete_admin"
on public.activity_selections
for delete
to authenticated
using (public.is_admin());

