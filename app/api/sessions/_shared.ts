export const SESSION_STATUS_VALUES = [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
] as const

export const SESSION_ACTIVITY_STATUS_VALUES = [
  "pending",
  "in_progress",
  "completed",
  "skipped",
] as const

export const ASSIGNMENT_TIMING_VALUES = ["before_event", "during_event"] as const

export function mapSessionsError(message: string) {
  const lower = message.toLowerCase()

  if (
    (lower.includes("relation \"public.members\"") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("members"))
  ) {
    return "La table `members` est absente (phase 1). Execute 001 a 008."
  }

  if (
    (lower.includes("relation \"public.profiles\"") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("profiles"))
  ) {
    return "La table `profiles` est absente (phase 1). Execute 001 a 008."
  }

  if (
    (lower.includes("relation \"public.app_config\"") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("app_config"))
  ) {
    return "La table `app_config` est absente (phase 1). Execute 001 a 008."
  }

  if (
    (lower.includes("relation \"public.sessions\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("sessions"))
  ) {
    return "La table `sessions` est absente. Execute `017_create_sessions.sql`."
  }

  if (
    (lower.includes("relation \"public.topics\"") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("topics"))
  ) {
    return "La table `topics` est absente. Execute `025_create_topics.sql`."
  }

  if (
    (lower.includes("column") && lower.includes("topic_id")) ||
    lower.includes("sessions_topic_id_fkey")
  ) {
    return "Le schema `sessions.topic_id` est manquant. Execute `034_add_sessions_topic_id.sql` puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    (lower.includes("relation \"public.session_activities\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") &&
      lower.includes("session_activities"))
  ) {
    return "La table `session_activities` est absente. Execute `018_create_session_activities.sql`."
  }

  if (
    ((lower.includes("relation \"public.session_activity_assignments\"") &&
      lower.includes("does not exist")) ||
      (lower.includes("could not find the table") &&
        lower.includes("session_activity_assignments"))) &&
    lower.includes("session_activity_assignments")
  ) {
    return "La table `session_activity_assignments` est absente. Execute `019_create_session_activity_assignments.sql`."
  }

  if (
    lower.includes("violates check constraint") &&
    lower.includes("session_activity_assignments_assignment_type_check")
  ) {
    return "La contrainte `assignment_type` est obsolete. Reexecute `019_create_session_activity_assignments.sql`, puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    lower.includes("could not find a relationship between") &&
    lower.includes("session_activity_assignments") &&
    lower.includes("profiles")
  ) {
    return "La relation entre `session_activity_assignments` et `profiles` est indisponible dans le schema cache. Execute `NOTIFY pgrst, 'reload schema';` puis reconnecte-toi."
  }

  if (
    lower.includes("could not find a relationship between") &&
    lower.includes("session_activities") &&
    lower.includes("session_activity_assignments")
  ) {
    return "La relation entre `session_activities` et `session_activity_assignments` est indisponible dans le schema cache. Reexecute `019_create_session_activity_assignments.sql`, puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (lower.includes("schema cache")) {
    return `Schema cache stale: ${message}`
  }

  if (
    lower.includes("null value in column") &&
    lower.includes("group_id") &&
    lower.includes("relation") &&
    (lower.includes("sessions") ||
      lower.includes("session_activities") ||
      lower.includes("session_activity_assignments"))
  ) {
    return "Le schema est legacy (`group_id` obligatoire sur les tables de seance). Execute `021_fix_sessions_legacy_group_id.sql` puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    lower.includes("column") &&
    lower.includes("session_activity_assignments") &&
    (lower.includes("assignment_type") ||
      lower.includes("reason") ||
      lower.includes("assigned_by") ||
      lower.includes("assigned_at"))
  ) {
    return "La table `session_activity_assignments` est incomplete. Reexecute `019_create_session_activity_assignments.sql`, puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    lower.includes("column") &&
    lower.includes("session_activities") &&
    (lower.includes("assignment_timing") ||
      lower.includes("order_index") ||
      lower.includes("duration") ||
      lower.includes("status"))
  ) {
    return "La table `session_activities` est incomplete. Reexecute `018_create_session_activities.sql`, puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (lower.includes("column") && lower.includes("session")) {
    return "Le schema phase 5 est incomplet. Reexecute les scripts SQL 017 a 020."
  }

  return message
}

export function isActiveMember(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active"
}

export function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}
