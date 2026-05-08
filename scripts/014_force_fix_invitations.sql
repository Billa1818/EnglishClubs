-- Emergency repair for invitations (schema + RLS + grants) in one shot.
-- Use this when /api/invitations keeps failing with:
-- - relation public.invitations does not exist
-- - schema cache missing columns
-- - new row violates row-level security policy

begin;

create extension if not exists pgcrypto;

-- 1) Ensure table exists, even on partially initialized projects.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid()
);

-- 2) Ensure expected columns exist.
alter table public.invitations add column if not exists token uuid;
alter table public.invitations add column if not exists type text;
alter table public.invitations add column if not exists email text;
alter table public.invitations add column if not exists expires_at timestamptz;
alter table public.invitations add column if not exists used_at timestamptz;
alter table public.invitations add column if not exists created_by uuid;
alter table public.invitations add column if not exists used_by uuid;
alter table public.invitations add column if not exists created_at timestamptz;
alter table public.invitations add column if not exists updated_at timestamptz;

-- 3) Backfill required values safely.
update public.invitations set token = gen_random_uuid() where token is null;
update public.invitations
set type = case when email is not null then 'email' else 'link' end
where type is null or type not in ('link', 'email');
update public.invitations set expires_at = now() + interval '7 days' where expires_at is null;
update public.invitations set created_at = now() where created_at is null;
update public.invitations set updated_at = now() where updated_at is null;

-- 4) Resolve duplicate tokens before unique index.
with ranked as (
  select
    ctid,
    row_number() over (
      partition by token
      order by created_at asc nulls last, ctid
    ) as rn
  from public.invitations
  where token is not null
)
update public.invitations i
set token = gen_random_uuid()
from ranked r
where i.ctid = r.ctid
  and r.rn > 1;

-- 5) Defaults and constraints.
alter table public.invitations alter column token set default gen_random_uuid();
alter table public.invitations alter column token set not null;
alter table public.invitations alter column type set default 'link';
alter table public.invitations alter column type set not null;
alter table public.invitations alter column expires_at set default (now() + interval '7 days');
alter table public.invitations alter column expires_at set not null;
alter table public.invitations alter column created_at set default now();
alter table public.invitations alter column created_at set not null;
alter table public.invitations alter column updated_at set default now();
alter table public.invitations alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invitations_type_check'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_type_check
      check (type in ('link', 'email'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invitations_email_required_for_email_type'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_email_required_for_email_type
      check ((type = 'link') or (type = 'email' and email is not null));
  end if;
end;
$$;

-- Optional foreign keys if profiles exists.
do $$
begin
  if to_regclass('public.profiles') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'invitations_created_by_fkey'
        and conrelid = 'public.invitations'::regclass
    ) then
      alter table public.invitations
        add constraint invitations_created_by_fkey
        foreign key (created_by) references public.profiles(id) on delete cascade;
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'invitations_used_by_fkey'
        and conrelid = 'public.invitations'::regclass
    ) then
      alter table public.invitations
        add constraint invitations_used_by_fkey
        foreign key (used_by) references public.profiles(id) on delete set null;
    end if;
  end if;
end;
$$;

create unique index if not exists idx_invitations_token on public.invitations(token);
create index if not exists idx_invitations_expires_at on public.invitations(expires_at);
create index if not exists idx_invitations_used_at on public.invitations(used_at);
create index if not exists idx_invitations_email on public.invitations(lower(email));

-- 6) Updated_at trigger.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_invitations_updated_at on public.invitations;
create trigger tr_invitations_updated_at
before update on public.invitations
for each row
execute function public.update_updated_at_column();

-- 7) RLS + policies without dependency on helper SQL functions.
alter table public.invitations enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitations'
  loop
    execute format('drop policy if exists %I on public.invitations', p.policyname);
  end loop;
end;
$$;

grant select, insert, update, delete on public.invitations to authenticated;

create policy "invitations_select_admin"
on public.invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  )
);

create policy "invitations_insert_admin"
on public.invitations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  )
);

create policy "invitations_update_admin"
on public.invitations
for update
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  )
);

create policy "invitations_delete_admin"
on public.invitations
for delete
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  )
);

notify pgrst, 'reload schema';

commit;
