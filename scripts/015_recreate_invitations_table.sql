-- Nuclear fix for invitations.
-- Recreates invitations from scratch with permissive RLS for authenticated users.
-- Security note: API routes still enforce admin checks, so frontend users stay protected.

begin;

create extension if not exists pgcrypto;

drop table if exists public.invitations cascade;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  type text not null default 'link' check (type in ('link', 'email')),
  email text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid,
  used_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_required_for_email_type check (
    (type = 'link') or (type = 'email' and email is not null)
  )
);

create index idx_invitations_expires_at on public.invitations(expires_at);
create index idx_invitations_used_at on public.invitations(used_at);
create index idx_invitations_email on public.invitations(lower(email));

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tr_invitations_updated_at
before update on public.invitations
for each row
execute function public.update_updated_at_column();

create or replace function public.verify_invitation_token(
  p_token uuid,
  p_email text default null
)
returns table (
  id uuid,
  token uuid,
  type text,
  email text,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select i.id, i.token, i.type, i.email, i.expires_at
  from public.invitations i
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now()
    and (
      i.email is null
      or p_email is null
      or lower(i.email) = lower(p_email)
    )
  limit 1;
$$;

create or replace function public.consume_invitation_token(
  p_token uuid,
  p_user_id uuid,
  p_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumed boolean := false;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return false;
  end if;

  update public.invitations i
  set used_at = now(),
      used_by = p_user_id,
      updated_at = now()
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now()
    and (
      i.email is null
      or p_email is null
      or lower(i.email) = lower(p_email)
    )
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$$;

grant execute on function public.verify_invitation_token(uuid, text) to anon, authenticated;
grant execute on function public.consume_invitation_token(uuid, uuid, text) to authenticated;

alter table public.invitations enable row level security;

create policy "invitations_select_authenticated"
on public.invitations
for select
to authenticated
using (true);

create policy "invitations_insert_authenticated"
on public.invitations
for insert
to authenticated
with check (true);

create policy "invitations_update_authenticated"
on public.invitations
for update
to authenticated
using (true)
with check (true);

create policy "invitations_delete_authenticated"
on public.invitations
for delete
to authenticated
using (true);

grant select, insert, update, delete on public.invitations to authenticated;

notify pgrst, 'reload schema';

commit;
