-- Phase 3 - Create invitations table and helper RPC functions

create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  type text not null default 'link' check (type in ('link', 'email')),
  email text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_required_for_email_type check (
    (type = 'link') or (type = 'email' and email is not null)
  )
);

create index if not exists idx_invitations_token on public.invitations(token);
create index if not exists idx_invitations_expires_at on public.invitations(expires_at);
create index if not exists idx_invitations_used_at on public.invitations(used_at);
create index if not exists idx_invitations_email on public.invitations(lower(email));

drop trigger if exists tr_invitations_updated_at on public.invitations;
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
