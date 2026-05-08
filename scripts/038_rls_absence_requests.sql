-- PHASE 7 - RLS policies for absence_requests

alter table public.absence_requests enable row level security;

drop policy if exists "absence_requests_select_active_members" on public.absence_requests;
create policy "absence_requests_select_active_members"
on public.absence_requests
for select
to authenticated
using (
  public.is_active_member()
  and (
    public.is_admin()
    or user_id = (select auth.uid())
  )
);

drop policy if exists "absence_requests_insert_self_pending" on public.absence_requests;
create policy "absence_requests_insert_self_pending"
on public.absence_requests
for insert
to authenticated
with check (
  public.is_active_member()
  and user_id = (select auth.uid())
  and status = 'pending'
  and reviewed_at is null
);

drop policy if exists "absence_requests_update_admin" on public.absence_requests;
create policy "absence_requests_update_admin"
on public.absence_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "absence_requests_delete_admin" on public.absence_requests;
create policy "absence_requests_delete_admin"
on public.absence_requests
for delete
to authenticated
using (public.is_admin());
