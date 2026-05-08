-- PHASE 8 - Create activity_selections table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.activity_selections (
  id text primary key default gen_random_uuid()::text,
  cycle_id text not null,
  user_id uuid not null,
  session_id text not null,
  session_activity_id text not null,
  counts_in_cycle boolean not null default true,
  selection_mode text not null default 'automatic',
  selected_by uuid,
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_selections
  add column if not exists cycle_id text,
  add column if not exists user_id uuid,
  add column if not exists session_id text,
  add column if not exists session_activity_id text,
  add column if not exists counts_in_cycle boolean,
  add column if not exists selection_mode text,
  add column if not exists selected_by uuid,
  add column if not exists selected_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Align cycle_id type with activity_selection_cycles.id (uuid/text) when needed.
do $$
declare
  cycles_id_type text;
  cycle_id_type text;
begin
  select data_type
  into cycles_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_selection_cycles'
    and column_name = 'id';

  select data_type
  into cycle_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_selections'
    and column_name = 'cycle_id';

  if cycles_id_type = 'uuid' and cycle_id_type <> 'uuid' then
    execute 'alter table public.activity_selections alter column cycle_id type uuid using nullif(btrim(cycle_id), '''')::uuid';
  elsif cycles_id_type = 'text' and cycle_id_type <> 'text' then
    execute 'alter table public.activity_selections alter column cycle_id type text using cycle_id::text';
  end if;
end
$$;

-- Align session_id type with sessions.id (uuid/text) when needed.
do $$
declare
  sessions_id_type text;
  session_id_type text;
begin
  select data_type
  into sessions_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sessions'
    and column_name = 'id';

  select data_type
  into session_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_selections'
    and column_name = 'session_id';

  if sessions_id_type = 'uuid' and session_id_type <> 'uuid' then
    execute 'alter table public.activity_selections alter column session_id type uuid using nullif(btrim(session_id), '''')::uuid';
  elsif sessions_id_type = 'text' and session_id_type <> 'text' then
    execute 'alter table public.activity_selections alter column session_id type text using session_id::text';
  end if;
end
$$;

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
    and table_name = 'activity_selections'
    and column_name = 'session_activity_id';

  if session_activities_id_type = 'uuid' and session_activity_id_type <> 'uuid' then
    execute 'alter table public.activity_selections alter column session_activity_id type uuid using nullif(btrim(session_activity_id), '''')::uuid';
  elsif session_activities_id_type = 'text' and session_activity_id_type <> 'text' then
    execute 'alter table public.activity_selections alter column session_activity_id type text using session_activity_id::text';
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
    and table_name = 'activity_selections'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.activity_selections alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.activity_selections alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.activity_selections alter column counts_in_cycle set default true;
alter table public.activity_selections alter column selection_mode set default 'automatic';
alter table public.activity_selections alter column selected_at set default now();
alter table public.activity_selections alter column created_at set default now();
alter table public.activity_selections alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_selections'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.activity_selections
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.activity_selections
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.activity_selections
set
  counts_in_cycle = coalesce(counts_in_cycle, true),
  selection_mode = case
    when selection_mode in ('automatic', 'manual', 'semi-automatic') then selection_mode
    else 'automatic'
  end,
  selected_at = coalesce(selected_at, now()),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Remove rows that cannot satisfy required FK/NOT NULL constraints.
delete from public.activity_selections
where cycle_id is null
  or user_id is null
  or session_id is null
  or session_activity_id is null;

-- Ensure at most one counted selection per user in a given cycle.
with ranked as (
  select
    id,
    row_number() over (
      partition by cycle_id, user_id
      order by selected_at asc, created_at asc, id asc
    ) as rn
  from public.activity_selections
  where counts_in_cycle = true
)
update public.activity_selections s
set counts_in_cycle = false
from ranked
where s.id = ranked.id
  and ranked.rn > 1;

-- Required columns.
alter table public.activity_selections alter column id set not null;
alter table public.activity_selections alter column cycle_id set not null;
alter table public.activity_selections alter column user_id set not null;
alter table public.activity_selections alter column session_id set not null;
alter table public.activity_selections alter column session_activity_id set not null;
alter table public.activity_selections alter column counts_in_cycle set not null;
alter table public.activity_selections alter column selection_mode set not null;
alter table public.activity_selections alter column selected_at set not null;
alter table public.activity_selections alter column created_at set not null;
alter table public.activity_selections alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_selections'::regclass
      and contype = 'p'
  ) then
    alter table public.activity_selections add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selections_selection_mode_check'
      and conrelid = 'public.activity_selections'::regclass
  ) then
    alter table public.activity_selections
      add constraint activity_selections_selection_mode_check
      check (selection_mode in ('automatic', 'manual', 'semi-automatic'));
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.activity_selection_cycles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selections_cycle_id_fkey'
      and conrelid = 'public.activity_selections'::regclass
  ) then
    alter table public.activity_selections
      add constraint activity_selections_cycle_id_fkey
      foreign key (cycle_id) references public.activity_selection_cycles(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selections_user_id_fkey'
      and conrelid = 'public.activity_selections'::regclass
  ) then
    alter table public.activity_selections
      add constraint activity_selections_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if to_regclass('public.sessions') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selections_session_id_fkey'
      and conrelid = 'public.activity_selections'::regclass
  ) then
    alter table public.activity_selections
      add constraint activity_selections_session_id_fkey
      foreign key (session_id) references public.sessions(id) on delete cascade;
  end if;

  if to_regclass('public.session_activities') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selections_session_activity_id_fkey'
      and conrelid = 'public.activity_selections'::regclass
  ) then
    alter table public.activity_selections
      add constraint activity_selections_session_activity_id_fkey
      foreign key (session_activity_id) references public.session_activities(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selections_selected_by_fkey'
      and conrelid = 'public.activity_selections'::regclass
  ) then
    alter table public.activity_selections
      add constraint activity_selections_selected_by_fkey
      foreign key (selected_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_activity_selections_cycle_id
  on public.activity_selections(cycle_id);

create index if not exists idx_activity_selections_user_id
  on public.activity_selections(user_id);

create index if not exists idx_activity_selections_session_id
  on public.activity_selections(session_id);

create index if not exists idx_activity_selections_selected_at
  on public.activity_selections(selected_at desc);

create unique index if not exists idx_activity_selections_unique_counted_user_per_cycle
  on public.activity_selections(cycle_id, user_id)
  where counts_in_cycle = true;

-- Ensure single updated_at trigger.
drop trigger if exists tr_activity_selections_updated_at
  on public.activity_selections;
create trigger tr_activity_selections_updated_at
before update on public.activity_selections
for each row
execute function public.update_updated_at_column();

