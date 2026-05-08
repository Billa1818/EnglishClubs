-- Phase 3 - RLS policies for invitations

alter table public.invitations enable row level security;

drop policy if exists "invitations_select_admin" on public.invitations;
create policy "invitations_select_admin"
on public.invitations
for select
to authenticated
using (public.is_admin());

drop policy if exists "invitations_insert_admin" on public.invitations;
create policy "invitations_insert_admin"
on public.invitations
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "invitations_update_admin" on public.invitations;
create policy "invitations_update_admin"
on public.invitations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "invitations_delete_admin" on public.invitations;
create policy "invitations_delete_admin"
on public.invitations
for delete
to authenticated
using (public.is_admin());
