-- PHASE 10 - RLS policies for FreeCodeCamp progressions + private storage bucket

-- 10.1 Bucket prive pour les screenshots FCC
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'fcc-screenshots',
  'fcc-screenshots',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.fcc_progressions enable row level security;

-- fcc_progressions

drop policy if exists "fcc_progressions_select_active_members" on public.fcc_progressions;
create policy "fcc_progressions_select_active_members"
on public.fcc_progressions
for select
to authenticated
using (public.is_active_member());

drop policy if exists "fcc_progressions_insert_own_active_member" on public.fcc_progressions;
create policy "fcc_progressions_insert_own_active_member"
on public.fcc_progressions
for insert
to authenticated
with check (
  public.is_active_member()
  and user_id = (select auth.uid())
);

drop policy if exists "fcc_progressions_update_own_or_admin" on public.fcc_progressions;
create policy "fcc_progressions_update_own_or_admin"
on public.fcc_progressions
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_member()
    and user_id = (select auth.uid())
  )
)
with check (
  public.is_admin()
  or (
    public.is_active_member()
    and user_id = (select auth.uid())
  )
);

drop policy if exists "fcc_progressions_delete_admin" on public.fcc_progressions;
create policy "fcc_progressions_delete_admin"
on public.fcc_progressions
for delete
to authenticated
using (public.is_admin());

-- storage.objects policies for bucket fcc-screenshots

-- NOTE:
-- Ne pas executer `alter table storage.objects enable row level security` ici.
-- Sur certaines versions Supabase/CLI cela renvoie:
-- `must be owner of table objects` (SQLSTATE 42501).
-- RLS est deja active sur storage.objects par defaut.

drop policy if exists "fcc_screenshots_select_owner_or_admin" on storage.objects;
create policy "fcc_screenshots_select_owner_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'fcc-screenshots'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or public.is_admin()
  )
);

drop policy if exists "fcc_screenshots_insert_owner_folder" on storage.objects;
create policy "fcc_screenshots_insert_owner_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fcc-screenshots'
  and public.is_active_member()
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "fcc_screenshots_update_owner_or_admin" on storage.objects;
create policy "fcc_screenshots_update_owner_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'fcc-screenshots'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or public.is_admin()
  )
)
with check (
  bucket_id = 'fcc-screenshots'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or public.is_admin()
  )
);

drop policy if exists "fcc_screenshots_delete_owner_or_admin" on storage.objects;
create policy "fcc_screenshots_delete_owner_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fcc-screenshots'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or public.is_admin()
  )
);
