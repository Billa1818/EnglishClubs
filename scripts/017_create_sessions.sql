-- PHASE 5 - Create sessions table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'upcoming',
  notes text,
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  current_activity_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions
  add column if not exists date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists status text,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists current_activity_index integer,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Legacy compatibility:
-- some older schemas include sessions.group_id as NOT NULL, which breaks phase 5 inserts.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.sessions alter column group_id drop not null';
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
    and table_name = 'sessions'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.sessions alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.sessions alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.sessions alter column status set default 'upcoming';
alter table public.sessions alter column created_at set default now();
alter table public.sessions alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sessions'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.sessions
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.sessions
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.sessions
set
  date = coalesce(date, now()::date),
  start_time = coalesce(start_time, time '18:00'),
  end_time = coalesce(end_time, time '20:00'),
  status = case
    when status in ('upcoming', 'ongoing', 'completed', 'cancelled') then status
    else 'upcoming'
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Keep coherent schedule bounds.
update public.sessions
set end_time = start_time + interval '1 hour'
where end_time <= start_time;

-- Required columns.
alter table public.sessions alter column id set not null;
alter table public.sessions alter column date set not null;
alter table public.sessions alter column start_time set not null;
alter table public.sessions alter column end_time set not null;
alter table public.sessions alter column status set not null;
alter table public.sessions alter column created_at set not null;
alter table public.sessions alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sessions'::regclass
      and contype = 'p'
  ) then
    alter table public.sessions add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_status_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_status_check
      check (status in ('upcoming', 'ongoing', 'completed', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_time_bounds_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_time_bounds_check
      check (end_time > start_time);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_current_activity_index_positive_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_current_activity_index_positive_check
      check (current_activity_index is null or current_activity_index >= 0);
  end if;
end
$$;

-- FK created_by -> profiles(id)
do $$
begin
  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_created_by_fkey'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_sessions_date on public.sessions(date);
create index if not exists idx_sessions_status on public.sessions(status);
create index if not exists idx_sessions_created_by on public.sessions(created_by);

-- Ensure single updated_at trigger.
drop trigger if exists tr_sessions_updated_at on public.sessions;
create trigger tr_sessions_updated_at
before update on public.sessions
for each row
execute function public.update_updated_at_column();
