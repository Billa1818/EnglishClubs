-- PHASE 9 - RLS policies for topics domain

alter table public.topics enable row level security;
alter table public.topic_usages enable row level security;

-- topics

drop policy if exists "topics_select_active_members" on public.topics;
create policy "topics_select_active_members"
on public.topics
for select
to authenticated
using (public.is_active_member());

drop policy if exists "topics_insert_admin" on public.topics;
create policy "topics_insert_admin"
on public.topics
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "topics_update_admin" on public.topics;
create policy "topics_update_admin"
on public.topics
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "topics_delete_admin" on public.topics;
create policy "topics_delete_admin"
on public.topics
for delete
to authenticated
using (public.is_admin());

-- topic_usages

drop policy if exists "topic_usages_select_active_members" on public.topic_usages;
create policy "topic_usages_select_active_members"
on public.topic_usages
for select
to authenticated
using (public.is_active_member());

drop policy if exists "topic_usages_insert_active_members" on public.topic_usages;
create policy "topic_usages_insert_active_members"
on public.topic_usages
for insert
to authenticated
with check (public.is_active_member());

drop policy if exists "topic_usages_update_admin" on public.topic_usages;
create policy "topic_usages_update_admin"
on public.topic_usages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "topic_usages_delete_admin" on public.topic_usages;
create policy "topic_usages_delete_admin"
on public.topic_usages
for delete
to authenticated
using (public.is_admin());
