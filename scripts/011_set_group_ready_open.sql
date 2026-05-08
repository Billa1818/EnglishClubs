-- Phase 3 helper - Put community in an "open and ready" state.
-- Use this when you want everyone to join easily.

begin;

insert into public.app_config (id, access_type)
values ('00000000-0000-0000-0000-000000000001', 'open')
on conflict (id)
do update
set access_type = excluded.access_type,
    updated_at = now();

insert into public.members (user_id, status, role, joined_at)
select p.id, 'active', 'member', now()
from public.profiles p
on conflict (user_id) do nothing;

update public.members
set status = 'active',
    updated_at = now()
where status <> 'active';

with has_admin as (
  select exists (
    select 1
    from public.members
    where role = 'admin'
      and status = 'active'
  ) as ok
),
first_member as (
  select m.user_id
  from public.members m
  order by m.joined_at asc
  limit 1
)
update public.members m
set role = 'admin',
    status = 'active',
    updated_at = now()
from has_admin, first_member
where has_admin.ok = false
  and m.user_id = first_member.user_id;

notify pgrst, 'reload schema';

commit;
