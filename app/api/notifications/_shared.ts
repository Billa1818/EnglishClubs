import { mapSessionsError } from "../sessions/_shared"

export const NOTIFICATION_SELECT =
  "id, user_id, type, title, body, is_read, metadata, created_at, updated_at"

export type NotificationRow = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type NotificationPreferenceRow = {
  id: string
  user_id: string
  notification_type: string
  in_app: boolean
  email: boolean
  created_at: string
  updated_at: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  string,
  { inApp: boolean; email: boolean }
> = {
  session_reminder: { inApp: true, email: true },
  activity_assignment: { inApp: true, email: true },
  absence_request_result: { inApp: true, email: true },
  membership_request: { inApp: true, email: false },
  new_absence_request: { inApp: true, email: false },
  fcc_reminder: { inApp: true, email: false },
  new_session: { inApp: true, email: true },
}

export function mapNotificationsError(message: string) {
  const lower = message.toLowerCase()

  if (
    (lower.includes('relation "public.notifications"') && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("notifications"))
  ) {
    return "La table `notifications` est absente. Execute `031_create_notifications.sql` puis `033_rls_notifications.sql`."
  }

  if (
    (lower.includes('relation "public.notification_preferences"') &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") &&
      lower.includes("notification_preferences"))
  ) {
    return "La table `notification_preferences` est absente. Execute `032_create_notification_preferences.sql` puis `033_rls_notifications.sql`."
  }

  if (
    lower.includes("schema cache") &&
    (lower.includes("notifications") || lower.includes("notification_preferences"))
  ) {
    return "Le schema cache Supabase est stale pour les notifications. Execute `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    lower.includes("column") &&
    (lower.includes("notifications") || lower.includes("notification_preferences"))
  ) {
    return "Le schema phase 11 est incomplet. Reexecute les scripts SQL 031 a 033, puis `NOTIFY pgrst, 'reload schema';`."
  }

  const fromSessions = mapSessionsError(message)
  if (fromSessions !== message) {
    return fromSessions
  }

  return message
}
