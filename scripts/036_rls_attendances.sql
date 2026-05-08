-- PHASE 6 - RLS policies for attendances

alter table public.attendances enable row level security;

drop policy if exists "attendances_select_active_members" on public.attendances;
create policy "attendances_select_active_members"
on public.attendances
for select
to authenticated
using (public.is_active_member());

drop policy if exists "attendances_insert_self_declared" on public.attendances;
create policy "attendances_insert_self_declared"
on public.attendances
for insert
to authenticated
with check (
  public.is_active_member()
  and user_id = (select auth.uid())
  and status = 'declared'
);

drop policy if exists "attendances_update_admin" on public.attendances;
create policy "attendances_update_admin"
on public.attendances
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "attendances_delete_admin" on public.attendances;
create policy "attendances_delete_admin"
on public.attendances
for delete
to authenticated
using (public.is_admin());
