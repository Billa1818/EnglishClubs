-- Phase 2 helper - Open registration for everyone
-- Execute this once in Supabase SQL Editor on an existing project.

insert into public.app_config (id, access_type)
values ('00000000-0000-0000-0000-000000000001', 'open')
on conflict (id)
do update set access_type = excluded.access_type;

notify pgrst, 'reload schema';
