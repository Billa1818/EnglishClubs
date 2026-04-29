-- DANGER: this script deletes ALL Supabase Auth users.
-- Use only if you really want a full authentication reset.

begin;

delete from auth.users;

commit;
