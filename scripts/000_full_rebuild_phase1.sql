-- Full rebuild Phase 1 (reset + recreate)
-- Run this in Supabase SQL Editor as a single script.

begin;

-- =========================
-- RESET
-- =========================
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists tr_profiles_auto_member on public.profiles';
    execute 'drop trigger if exists tr_profiles_updated_at on public.profiles';
  end if;

  if to_regclass('public.members') is not null then
    execute 'drop trigger if exists tr_members_updated_at on public.members';
  end if;

  if to_regclass('public.app_config') is not null then
    execute 'drop trigger if exists tr_app_config_updated_at on public.app_config';
  end if;
end;
$$;

drop function if exists public.handle_new_profile() cascade;
drop function if exists public.get_member_status() cascade;
drop function if exists public.is_active_member() cascade;
drop function if exists public.is_admin() cascade;

drop table if exists public.members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.app_config cascade;

drop function if exists public.is_authenticated() cascade;
drop function if exists public.update_updated_at_column() cascade;

-- =========================
-- 001_helper_functions.sql
-- =========================
create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant execute on function public.is_authenticated() to anon, authenticated;

-- =========================
-- 002_create_profiles.sql
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  pseudo text not null unique,
  photo_url text,
  english_level text not null default 'beginner' check (
    english_level in ('beginner', 'intermediate', 'advanced')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

-- =========================
-- 003_create_members.sql
-- =========================
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

-- =========================
-- 004_create_app_config.sql
-- =========================
create table if not exists public.app_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  app_name text not null default 'English Club',
  access_type text not null default 'open' check (
    access_type in ('open', 'invitation')
  ),
  schedule_days text[] not null default array['saturday']::text[],
  start_time time not null default '18:00'::time,
  end_time time not null default '20:00'::time,
  frequency text not null default 'weekly',
  rules text,
  absence_min_delay_hours integer not null default 24 check (absence_min_delay_hours > 0),
  fcc_reminder_days integer not null default 7 check (fcc_reminder_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_config_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

create trigger tr_app_config_updated_at
before update on public.app_config
for each row
execute function public.update_updated_at_column();

insert into public.app_config (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- =========================
-- 005_rls_profiles.sql
-- =========================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (public.is_authenticated());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================
-- 006_rls_members.sql
-- =========================
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

-- =========================
-- 007_rls_app_config.sql
-- =========================
alter table public.app_config enable row level security;

drop policy if exists "app_config_select_active_members" on public.app_config;
create policy "app_config_select_active_members"
on public.app_config
for select
to authenticated
using (public.is_active_member());

drop policy if exists "app_config_update_admin" on public.app_config;
create policy "app_config_update_admin"
on public.app_config
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================
-- 008_trigger_auto_member.sql
-- =========================
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_member_count bigint;
begin
  select count(*) into active_member_count
  from public.members
  where status = 'active';

  insert into public.members (user_id, status, role, joined_at)
  values (
    new.id,
    'active',
    case when active_member_count = 0 then 'admin' else 'member' end,
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists tr_profiles_auto_member on public.profiles;
create trigger tr_profiles_auto_member
after insert on public.profiles
for each row
execute function public.handle_new_profile();

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
