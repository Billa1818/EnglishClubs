-- Phase 1 - Auto create member row when a profile is created

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (user_id, status, role, joined_at)
  values (
    new.id,
    'pending',
    'member',
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
