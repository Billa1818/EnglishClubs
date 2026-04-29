-- Phase 1 - Create members table

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'active', 'suspended', 'removed')
  ),
  role text not null default 'member' check (
    role in ('admin', 'member')
  ),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_members_user_id on public.members(user_id);
create index if not exists idx_members_status on public.members(status);
create index if not exists idx_members_role on public.members(role);

create trigger tr_members_updated_at
before update on public.members
for each row
execute function public.update_updated_at_column();

create or replace function public.get_member_status()
returns text
language sql
stable
set search_path = public
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
set search_path = public
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
set search_path = public
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
