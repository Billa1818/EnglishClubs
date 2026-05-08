-- PHASE 5 - Create session_activity_assignments table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.session_activity_assignments (
  id text primary key default gen_random_uuid()::text,
  session_activity_id text not null,
  user_id uuid not null,
  assignment_type text not null default 'participant',
  reason text,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_activity_assignments
  add column if not exists session_activity_id text,
  add column if not exists user_id uuid,
  add column if not exists assignment_type text,
  add column if not exists reason text,
  add column if not exists assigned_by uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Align session_activity_id type with session_activities.id (uuid/text) when needed.
do $$
declare
  session_activities_id_type text;
  session_activity_id_type text;
begin
  select data_type
  into session_activities_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'session_activities'
    and column_name = 'id';

  select data_type
  into session_activity_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'session_activity_assignments'
    and column_name = 'session_activity_id';

  if session_activities_id_type = 'uuid' and session_activity_id_type <> 'uuid' then
    execute 'alter table public.session_activity_assignments alter column session_activity_id type uuid using nullif(btrim(session_activity_id), '''')::uuid';
  elsif session_activities_id_type = 'text' and session_activity_id_type <> 'text' then
    execute 'alter table public.session_activity_assignments alter column session_activity_id type text using session_activity_id::text';
  end if;
end
$$;

-- Keep existing id type (uuid/text) to avoid breaking dependent policies/FKs.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'session_activity_assignments'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.session_activity_assignments alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.session_activity_assignments alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.session_activity_assignments alter column assignment_type set default 'participant';
alter table public.session_activity_assignments alter column assigned_at set default now();
alter table public.session_activity_assignments alter column created_at set default now();
alter table public.session_activity_assignments alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'session_activity_assignments'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.session_activity_assignments
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.session_activity_assignments
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.session_activity_assignments
set
  assignment_type = coalesce(nullif(btrim(assignment_type), ''), 'participant'),
  assigned_at = coalesce(assigned_at, now()),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Legacy compatibility:
-- Older schemas may still contain a restrictive check constraint on assignment_type
-- (for example values such as auto/manual only).
-- Drop any previous check constraint mentioning assignment_type, then recreate
-- a permissive non-empty check compatible with phase 5 payloads.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.session_activity_assignments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%assignment_type%'
  loop
    execute format(
      'alter table public.session_activity_assignments drop constraint %I',
      c.conname
    );
  end loop;
end
$$;

-- Required columns.
alter table public.session_activity_assignments alter column id set not null;
alter table public.session_activity_assignments alter column session_activity_id set not null;
alter table public.session_activity_assignments alter column user_id set not null;
alter table public.session_activity_assignments alter column assignment_type set not null;
alter table public.session_activity_assignments alter column assigned_at set not null;
alter table public.session_activity_assignments alter column created_at set not null;
alter table public.session_activity_assignments alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.session_activity_assignments'::regclass
      and contype = 'p'
  ) then
    alter table public.session_activity_assignments add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activity_assignments_assignment_type_check'
      and conrelid = 'public.session_activity_assignments'::regclass
  ) then
    alter table public.session_activity_assignments
      add constraint session_activity_assignments_assignment_type_check
      check (length(btrim(assignment_type)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activity_assignments_unique'
      and conrelid = 'public.session_activity_assignments'::regclass
  ) then
    alter table public.session_activity_assignments
      add constraint session_activity_assignments_unique
      unique (session_activity_id, user_id, assignment_type);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.session_activities') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'session_activity_assignments_session_activity_id_fkey'
      and conrelid = 'public.session_activity_assignments'::regclass
  ) then
    alter table public.session_activity_assignments
      add constraint session_activity_assignments_session_activity_id_fkey
      foreign key (session_activity_id) references public.session_activities(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'session_activity_assignments_user_id_fkey'
      and conrelid = 'public.session_activity_assignments'::regclass
  ) then
    alter table public.session_activity_assignments
      add constraint session_activity_assignments_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'session_activity_assignments_assigned_by_fkey'
      and conrelid = 'public.session_activity_assignments'::regclass
  ) then
    alter table public.session_activity_assignments
      add constraint session_activity_assignments_assigned_by_fkey
      foreign key (assigned_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_session_activity_assignments_activity
  on public.session_activity_assignments(session_activity_id);

create index if not exists idx_session_activity_assignments_user
  on public.session_activity_assignments(user_id);

create index if not exists idx_session_activity_assignments_assigned_at
  on public.session_activity_assignments(assigned_at desc);

-- Ensure single updated_at trigger.
drop trigger if exists tr_session_activity_assignments_updated_at
  on public.session_activity_assignments;
create trigger tr_session_activity_assignments_updated_at
before update on public.session_activity_assignments
for each row
execute function public.update_updated_at_column();
