-- PHASE 13+ - Fix recursive RLS helper functions on members
-- Safe to re-run.

create or replace function public.get_member_status()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.status
  from public.members m
  where m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  );
$$;

grant execute on function public.get_member_status() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.is_admin() to authenticated;
