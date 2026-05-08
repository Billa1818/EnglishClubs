-- Phase 3 repair - Recreate invitations RLS policies.
-- Run this if you get: "new row violates row-level security policy for table invitations".

begin;

alter table public.invitations enable row level security;

-- Remove any legacy or conflicting policies first.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitations'
  loop
    execute format('drop policy if exists %I on public.invitations', p.policyname);
  end loop;
end;
$$;

-- Ensure runtime roles can use helper functions and table privileges.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant select, insert, update, delete on table public.invitations to authenticated;

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

notify pgrst, 'reload schema';

commit;
