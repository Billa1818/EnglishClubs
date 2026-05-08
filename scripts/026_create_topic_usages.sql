-- PHASE 9 - Create topic_usages table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.topic_usages (
  id text primary key default gen_random_uuid()::text,
  topic_id text not null,
  session_id text not null,
  user_id uuid not null,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topic_usages
  add column if not exists topic_id text,
  add column if not exists session_id text,
  add column if not exists user_id uuid,
  add column if not exists used_at timestamptz,
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
    and table_name = 'topic_usages'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.topic_usages alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.topic_usages alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

-- Align session_id type with sessions.id when needed.
do $$
declare
  sessions_id_type text;
  topic_usages_session_id_type text;
begin
  select data_type
  into sessions_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sessions'
    and column_name = 'id';

  select data_type
  into topic_usages_session_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'topic_usages'
    and column_name = 'session_id';

  if sessions_id_type = 'uuid' and topic_usages_session_id_type <> 'uuid' then
    execute 'alter table public.topic_usages alter column session_id type uuid using nullif(btrim(session_id), '''')::uuid';
  elsif sessions_id_type = 'text' and topic_usages_session_id_type <> 'text' then
    execute 'alter table public.topic_usages alter column session_id type text using session_id::text';
  end if;
end
$$;

alter table public.topic_usages alter column used_at set default now();
alter table public.topic_usages alter column created_at set default now();
alter table public.topic_usages alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'topic_usages'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.topic_usages
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.topic_usages
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.topic_usages
set
  used_at = coalesce(used_at, now()),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Required columns.
alter table public.topic_usages alter column id set not null;
alter table public.topic_usages alter column topic_id set not null;
alter table public.topic_usages alter column session_id set not null;
alter table public.topic_usages alter column user_id set not null;
alter table public.topic_usages alter column used_at set not null;
alter table public.topic_usages alter column created_at set not null;
alter table public.topic_usages alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.topic_usages'::regclass
      and contype = 'p'
  ) then
    alter table public.topic_usages add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'topic_usages_unique_per_member_session'
      and conrelid = 'public.topic_usages'::regclass
  ) then
    alter table public.topic_usages
      add constraint topic_usages_unique_per_member_session
      unique (topic_id, session_id, user_id);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.topics') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'topic_usages_topic_id_fkey'
      and conrelid = 'public.topic_usages'::regclass
  ) then
    alter table public.topic_usages
      add constraint topic_usages_topic_id_fkey
      foreign key (topic_id) references public.topics(id) on delete cascade;
  end if;

  if to_regclass('public.sessions') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'topic_usages_session_id_fkey'
      and conrelid = 'public.topic_usages'::regclass
  ) then
    alter table public.topic_usages
      add constraint topic_usages_session_id_fkey
      foreign key (session_id) references public.sessions(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'topic_usages_user_id_fkey'
      and conrelid = 'public.topic_usages'::regclass
  ) then
    alter table public.topic_usages
      add constraint topic_usages_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_topic_usages_topic_id
  on public.topic_usages(topic_id);

create index if not exists idx_topic_usages_session_id
  on public.topic_usages(session_id);

create index if not exists idx_topic_usages_user_id
  on public.topic_usages(user_id);

create index if not exists idx_topic_usages_used_at
  on public.topic_usages(used_at desc);

-- Maintain topics.usage_count from usages table.
create or replace function public.sync_topics_usage_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.topics
    set usage_count = usage_count + 1
    where id = new.topic_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.topics
    set usage_count = greatest(usage_count - 1, 0)
    where id = old.topic_id;
    return old;
  elsif tg_op = 'UPDATE' then
    if new.topic_id is distinct from old.topic_id then
      update public.topics
      set usage_count = greatest(usage_count - 1, 0)
      where id = old.topic_id;

      update public.topics
      set usage_count = usage_count + 1
      where id = new.topic_id;
    end if;
    return new;
  end if;

  return null;
end;
$$;

-- Recompute counters from existing data (safe after reruns).
with usage_agg as (
  select topic_id, count(*)::integer as usage_total
  from public.topic_usages
  group by topic_id
)
update public.topics t
set usage_count = coalesce(usage_agg.usage_total, 0)
from usage_agg
where t.id = usage_agg.topic_id;

update public.topics t
set usage_count = 0
where not exists (
  select 1
  from public.topic_usages tu
  where tu.topic_id = t.id
);

-- Ensure single updated_at trigger.
drop trigger if exists tr_topic_usages_updated_at on public.topic_usages;
create trigger tr_topic_usages_updated_at
before update on public.topic_usages
for each row
execute function public.update_updated_at_column();

drop trigger if exists tr_topic_usages_usage_counter on public.topic_usages;
create trigger tr_topic_usages_usage_counter
after insert or update or delete on public.topic_usages
for each row
execute function public.sync_topics_usage_count();
