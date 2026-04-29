-- Phase 1 - Auto create member row when a profile is created

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_member_count bigint;
begin
  select count(*) into active_member_count
  from public.members
  where status = 'active';

  insert into public.members (user_id, status, role, joined_at)
  values (
    new.id,
    'active',
    case when active_member_count = 0 then 'admin' else 'member' end,
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists tr_profiles_auto_member on public.profiles;
create trigger tr_profiles_auto_member
after insert on public.profiles
for each row
execute function public.handle_new_profile();
