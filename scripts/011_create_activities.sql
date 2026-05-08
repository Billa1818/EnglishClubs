-- PHASE 4 - Table activities (idempotent + legacy-safe)
-- Execute after phase 1/3 scripts.

create extension if not exists pgcrypto;

create table if not exists public.activities (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  name_en text not null,
  description text not null,
  category text not null,
  default_duration integer not null,
  min_duration integer not null,
  max_duration integer not null,
  members_required integer not null default 1,
  selection_mode text not null default 'manual',
  requires_topic boolean not null default false,
  topics_reusable boolean not null default false,
  instructions text not null,
  materials text[] not null default array[]::text[],
  icon text,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If an old schema exists, normalize it to the expected one.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activities'
      and column_name = 'id'
      and data_type <> 'text'
  ) then
    execute 'alter table public.activities alter column id type text using id::text';
  end if;
end
$$;

alter table public.activities
  add column if not exists name text,
  add column if not exists name_en text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists default_duration integer,
  add column if not exists min_duration integer,
  add column if not exists max_duration integer,
  add column if not exists members_required integer,
  add column if not exists selection_mode text,
  add column if not exists requires_topic boolean,
  add column if not exists topics_reusable boolean,
  add column if not exists instructions text,
  add column if not exists materials text[],
  add column if not exists icon text,
  add column if not exists is_default boolean,
  add column if not exists is_archived boolean,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Defaults
alter table public.activities alter column id set default gen_random_uuid()::text;
alter table public.activities alter column members_required set default 1;
alter table public.activities alter column selection_mode set default 'manual';
alter table public.activities alter column requires_topic set default false;
alter table public.activities alter column topics_reusable set default false;
alter table public.activities alter column materials set default array[]::text[];
alter table public.activities alter column is_default set default false;
alter table public.activities alter column is_archived set default false;
alter table public.activities alter column created_at set default now();
alter table public.activities alter column updated_at set default now();

-- Legacy compatibility:
-- If an old schema still has group_id NOT NULL, phase 4 seeding would fail.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activities'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.activities alter column group_id drop not null';
  end if;
end
$$;

-- Backfill nullable legacy rows before NOT NULL/constraints.
update public.activities
set
  id = coalesce(nullif(id, ''), gen_random_uuid()::text),
  name = coalesce(nullif(btrim(name), ''), 'Activite'),
  name_en = coalesce(nullif(btrim(name_en), ''), coalesce(nullif(btrim(name), ''), 'Activity')),
  description = coalesce(nullif(btrim(description), ''), 'Activite English Club'),
  category = case
    when category in ('ice_breaker', 'vocabulary', 'conversation', 'comprehension', 'writing') then category
    else 'conversation'
  end,
  default_duration = greatest(coalesce(default_duration, 10), 1),
  min_duration = greatest(coalesce(min_duration, 10), 1),
  max_duration = greatest(coalesce(max_duration, 10), 1),
  members_required = greatest(coalesce(members_required, 1), 1),
  selection_mode = case
    when selection_mode in ('automatic', 'manual', 'semi-automatic') then selection_mode
    else 'manual'
  end,
  requires_topic = coalesce(requires_topic, false),
  topics_reusable = coalesce(topics_reusable, false),
  instructions = coalesce(nullif(btrim(instructions), ''), 'Instructions a definir'),
  materials = coalesce(materials, array[]::text[]),
  is_default = coalesce(is_default, false),
  is_archived = coalesce(is_archived, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

update public.activities
set
  default_duration = greatest(min_duration, least(default_duration, max_duration))
where default_duration < min_duration or default_duration > max_duration;

-- Required columns
alter table public.activities alter column id set not null;
alter table public.activities alter column name set not null;
alter table public.activities alter column name_en set not null;
alter table public.activities alter column description set not null;
alter table public.activities alter column category set not null;
alter table public.activities alter column default_duration set not null;
alter table public.activities alter column min_duration set not null;
alter table public.activities alter column max_duration set not null;
alter table public.activities alter column members_required set not null;
alter table public.activities alter column selection_mode set not null;
alter table public.activities alter column requires_topic set not null;
alter table public.activities alter column topics_reusable set not null;
alter table public.activities alter column instructions set not null;
alter table public.activities alter column materials set not null;
alter table public.activities alter column is_default set not null;
alter table public.activities alter column is_archived set not null;
alter table public.activities alter column created_at set not null;
alter table public.activities alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activities'::regclass
      and contype = 'p'
  ) then
    alter table public.activities add primary key (id);
  end if;
end
$$;

-- Constraints
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_category_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_category_check
      check (category in ('ice_breaker', 'vocabulary', 'conversation', 'comprehension', 'writing'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_selection_mode_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_selection_mode_check
      check (selection_mode in ('automatic', 'manual', 'semi-automatic'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_default_duration_positive_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_default_duration_positive_check
      check (default_duration > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_min_duration_positive_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_min_duration_positive_check
      check (min_duration > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_max_duration_positive_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_max_duration_positive_check
      check (max_duration > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_members_required_positive_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_members_required_positive_check
      check (members_required > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_duration_bounds'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_duration_bounds
      check (min_duration <= default_duration and default_duration <= max_duration);
  end if;
end
$$;

-- FK created_by -> profiles(id)
do $$
begin
  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'activities_created_by_fkey'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_activities_category
  on public.activities(category);

create index if not exists idx_activities_archived
  on public.activities(is_archived);

create index if not exists idx_activities_default
  on public.activities(is_default);

drop trigger if exists tr_activities_updated_at on public.activities;
create trigger tr_activities_updated_at
before update on public.activities
for each row
execute function public.update_updated_at_column();
