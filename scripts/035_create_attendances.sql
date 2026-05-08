-- PHASE 6 - Create attendances table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.attendances (
  id text primary key default gen_random_uuid()::text,
  session_id text not null,
  user_id uuid not null,
  status text not null default 'declared',
  declared_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.attendances
  add column if not exists session_id text,
  add column if not exists user_id uuid,
  add column if not exists status text,
  add column if not exists declared_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Keep existing id type (uuid/text) when table already exists.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'attendances'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.attendances alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.attendances alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

-- Align session_id type with sessions.id when needed.
do $$
declare
  sessions_id_type text;
  attendances_session_id_type text;
begin
  select data_type
  into sessions_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sessions'
    and column_name = 'id';

  select data_type
  into attendances_session_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'attendances'
    and column_name = 'session_id';

  if sessions_id_type = 'uuid' and attendances_session_id_type <> 'uuid' then
    execute 'alter table public.attendances alter column session_id type uuid using nullif(btrim(session_id), '''')::uuid';
  elsif sessions_id_type = 'text' and attendances_session_id_type <> 'text' then
    execute 'alter table public.attendances alter column session_id type text using session_id::text';
  end if;
end
$$;

alter table public.attendances alter column status set default 'declared';
alter table public.attendances alter column created_at set default now();
alter table public.attendances alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'attendances'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.attendances
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.attendances
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.attendances
set
  status = case
    when status in ('declared', 'confirmed', 'absent', 'excused') then status
    else 'declared'
  end,
  declared_at = case
    when status in ('declared', 'confirmed')
      then coalesce(declared_at, created_at, now())
    else declared_at
  end,
  confirmed_at = case
    when status = 'confirmed'
      then coalesce(confirmed_at, declared_at, created_at, now())
    else confirmed_at
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Required columns.
alter table public.attendances alter column id set not null;
alter table public.attendances alter column session_id set not null;
alter table public.attendances alter column user_id set not null;
alter table public.attendances alter column status set not null;
alter table public.attendances alter column created_at set not null;
alter table public.attendances alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.attendances'::regclass
      and contype = 'p'
  ) then
    alter table public.attendances add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_status_check'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
      add constraint attendances_status_check
      check (status in ('declared', 'confirmed', 'absent', 'excused'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_unique_member_per_session'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
      add constraint attendances_unique_member_per_session
      unique (session_id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_confirmed_requires_timestamp_check'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
      add constraint attendances_confirmed_requires_timestamp_check
      check (status <> 'confirmed' or confirmed_at is not null);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.sessions') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_session_id_fkey'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
      add constraint attendances_session_id_fkey
      foreign key (session_id) references public.sessions(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_user_id_fkey'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
      add constraint attendances_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'attendances_confirmed_by_fkey'
      and conrelid = 'public.attendances'::regclass
  ) then
    alter table public.attendances
      add constraint attendances_confirmed_by_fkey
      foreign key (confirmed_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_attendances_session_id
  on public.attendances(session_id);

create index if not exists idx_attendances_user_id
  on public.attendances(user_id);

create index if not exists idx_attendances_status
  on public.attendances(status);

create index if not exists idx_attendances_declared_at
  on public.attendances(declared_at desc);

create index if not exists idx_attendances_confirmed_at
  on public.attendances(confirmed_at desc);

-- Ensure single updated_at trigger.
drop trigger if exists tr_attendances_updated_at on public.attendances;
create trigger tr_attendances_updated_at
before update on public.attendances
for each row
execute function public.update_updated_at_column();
