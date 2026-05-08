-- PHASE 11 - RLS policies for notifications

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- notifications

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_member()
    and user_id = (select auth.uid())
  )
);

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin"
on public.notifications
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
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

drop policy if exists "notifications_delete_own_or_admin" on public.notifications;
create policy "notifications_delete_own_or_admin"
on public.notifications
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_member()
    and user_id = (select auth.uid())
  )
);

-- notification_preferences

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (
  public.is_active_member()
  and user_id = (select auth.uid())
);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (
  public.is_active_member()
  and user_id = (select auth.uid())
);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (
  public.is_active_member()
  and user_id = (select auth.uid())
)
with check (
  public.is_active_member()
  and user_id = (select auth.uid())
);

drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own"
on public.notification_preferences
for delete
to authenticated
using (
  public.is_active_member()
  and user_id = (select auth.uid())
);
