-- PHASE 8 - Create activity_selection_cycles table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.activity_selection_cycles (
  id text primary key default gen_random_uuid()::text,
  activity_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_selection_cycles
  add column if not exists activity_id text,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists is_active boolean,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Align activity_id type with activities.id (uuid/text) when needed.
do $$
declare
  activities_id_type text;
  activity_id_type text;
begin
  select data_type
  into activities_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activities'
    and column_name = 'id';

  select data_type
  into activity_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_selection_cycles'
    and column_name = 'activity_id';

  if activities_id_type = 'uuid' and activity_id_type <> 'uuid' then
    execute 'alter table public.activity_selection_cycles alter column activity_id type uuid using nullif(btrim(activity_id), '''')::uuid';
  elsif activities_id_type = 'text' and activity_id_type <> 'text' then
    execute 'alter table public.activity_selection_cycles alter column activity_id type text using activity_id::text';
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
    and table_name = 'activity_selection_cycles'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.activity_selection_cycles alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.activity_selection_cycles alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.activity_selection_cycles alter column started_at set default now();
alter table public.activity_selection_cycles alter column is_active set default true;
alter table public.activity_selection_cycles alter column created_at set default now();
alter table public.activity_selection_cycles alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_selection_cycles'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.activity_selection_cycles
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.activity_selection_cycles
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.activity_selection_cycles
set
  started_at = coalesce(started_at, now()),
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now()),
  ended_at = case when coalesce(is_active, true) then null else coalesce(ended_at, now()) end;

-- Remove rows that cannot satisfy required FK/NOT NULL constraints.
delete from public.activity_selection_cycles where activity_id is null;

-- Keep at most one active cycle per activity (latest wins).
with ranked as (
  select
    id,
    row_number() over (
      partition by activity_id
      order by started_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.activity_selection_cycles
  where is_active = true
)
update public.activity_selection_cycles c
set
  is_active = false,
  ended_at = coalesce(c.ended_at, now())
from ranked
where c.id = ranked.id
  and ranked.rn > 1;

-- Required columns.
alter table public.activity_selection_cycles alter column id set not null;
alter table public.activity_selection_cycles alter column activity_id set not null;
alter table public.activity_selection_cycles alter column started_at set not null;
alter table public.activity_selection_cycles alter column is_active set not null;
alter table public.activity_selection_cycles alter column created_at set not null;
alter table public.activity_selection_cycles alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_selection_cycles'::regclass
      and contype = 'p'
  ) then
    alter table public.activity_selection_cycles add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selection_cycles_time_order_check'
      and conrelid = 'public.activity_selection_cycles'::regclass
  ) then
    alter table public.activity_selection_cycles
      add constraint activity_selection_cycles_time_order_check
      check (ended_at is null or ended_at >= started_at);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.activities') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selection_cycles_activity_id_fkey'
      and conrelid = 'public.activity_selection_cycles'::regclass
  ) then
    alter table public.activity_selection_cycles
      add constraint activity_selection_cycles_activity_id_fkey
      foreign key (activity_id) references public.activities(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activity_selection_cycles_created_by_fkey'
      and conrelid = 'public.activity_selection_cycles'::regclass
  ) then
    alter table public.activity_selection_cycles
      add constraint activity_selection_cycles_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_activity_selection_cycles_activity_id
  on public.activity_selection_cycles(activity_id);

create index if not exists idx_activity_selection_cycles_is_active
  on public.activity_selection_cycles(is_active);

create unique index if not exists idx_activity_selection_cycles_one_active_per_activity
  on public.activity_selection_cycles(activity_id)
  where is_active = true;

-- Ensure single updated_at trigger.
drop trigger if exists tr_activity_selection_cycles_updated_at
  on public.activity_selection_cycles;
create trigger tr_activity_selection_cycles_updated_at
before update on public.activity_selection_cycles
for each row
execute function public.update_updated_at_column();

