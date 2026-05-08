-- PHASE 5 - Create session_activities table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.session_activities (
  id text primary key default gen_random_uuid()::text,
  session_id text not null,
  activity_id text not null,
  order_index integer not null,
  duration integer not null,
  assignment_timing text not null default 'during_event',
  status text not null default 'pending',
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_activities
  add column if not exists session_id text,
  add column if not exists activity_id text,
  add column if not exists order_index integer,
  add column if not exists duration integer,
  add column if not exists assignment_timing text,
  add column if not exists status text,
  add column if not exists created_by uuid,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

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
    and table_name = 'session_activities'
    and column_name = 'session_id';

  if sessions_id_type = 'uuid' and session_id_type <> 'uuid' then
    execute 'alter table public.session_activities alter column session_id type uuid using nullif(btrim(session_id), '''')::uuid';
  elsif sessions_id_type = 'text' and session_id_type <> 'text' then
    execute 'alter table public.session_activities alter column session_id type text using session_id::text';
  end if;
end
$$;

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
    and table_name = 'session_activities'
    and column_name = 'activity_id';

  if activities_id_type = 'uuid' and activity_id_type <> 'uuid' then
    execute 'alter table public.session_activities alter column activity_id type uuid using nullif(btrim(activity_id), '''')::uuid';
  elsif activities_id_type = 'text' and activity_id_type <> 'text' then
    execute 'alter table public.session_activities alter column activity_id type text using activity_id::text';
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
    and table_name = 'session_activities'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.session_activities alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.session_activities alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.session_activities alter column assignment_timing set default 'during_event';
alter table public.session_activities alter column status set default 'pending';
alter table public.session_activities alter column created_at set default now();
alter table public.session_activities alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'session_activities'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.session_activities
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.session_activities
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.session_activities
set
  order_index = greatest(coalesce(order_index, 1), 1),
  duration = greatest(coalesce(duration, 10), 1),
  assignment_timing = case
    when assignment_timing in ('before_event', 'during_event') then assignment_timing
    else 'during_event'
  end,
  status = case
    when status in ('pending', 'in_progress', 'completed', 'skipped') then status
    else 'pending'
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Ensure sequential order within each session before unique constraint.
with ordered as (
  select
    id,
    row_number() over (
      partition by session_id
      order by order_index asc, created_at asc, id asc
    ) as normalized_order
  from public.session_activities
)
update public.session_activities sa
set order_index = ordered.normalized_order
from ordered
where sa.id = ordered.id
  and sa.order_index is distinct from ordered.normalized_order;

-- Required columns.
alter table public.session_activities alter column id set not null;
alter table public.session_activities alter column session_id set not null;
alter table public.session_activities alter column activity_id set not null;
alter table public.session_activities alter column order_index set not null;
alter table public.session_activities alter column duration set not null;
alter table public.session_activities alter column assignment_timing set not null;
alter table public.session_activities alter column status set not null;
alter table public.session_activities alter column created_at set not null;
alter table public.session_activities alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.session_activities'::regclass
      and contype = 'p'
  ) then
    alter table public.session_activities add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_assignment_timing_check'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_assignment_timing_check
      check (assignment_timing in ('before_event', 'during_event'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_status_check'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_status_check
      check (status in ('pending', 'in_progress', 'completed', 'skipped'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_duration_positive_check'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_duration_positive_check
      check (duration > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_order_positive_check'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_order_positive_check
      check (order_index > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_unique_order_per_session'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_unique_order_per_session
      unique (session_id, order_index);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.sessions') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_session_id_fkey'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_session_id_fkey
      foreign key (session_id) references public.sessions(id) on delete cascade;
  end if;

  if to_regclass('public.activities') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_activity_id_fkey'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_activity_id_fkey
      foreign key (activity_id) references public.activities(id) on delete restrict;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'session_activities_created_by_fkey'
      and conrelid = 'public.session_activities'::regclass
  ) then
    alter table public.session_activities
      add constraint session_activities_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_session_activities_session_id
  on public.session_activities(session_id);

create index if not exists idx_session_activities_activity_id
  on public.session_activities(activity_id);

create index if not exists idx_session_activities_status
  on public.session_activities(status);

-- Ensure single updated_at trigger.
drop trigger if exists tr_session_activities_updated_at on public.session_activities;
create trigger tr_session_activities_updated_at
before update on public.session_activities
for each row
execute function public.update_updated_at_column();
