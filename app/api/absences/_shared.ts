import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { mapSessionsError } from "@/app/api/sessions/_shared"

export const ABSENCE_SELECT =
  "id, session_id, user_id, reason, status, admin_comment, requested_at, reviewed_at, reviewed_by, created_at, updated_at"

export type AbsenceBaseRow = {
  id: string
  session_id: string
  user_id: string
  reason: string | null
  status: "pending" | "approved" | "rejected"
  admin_comment: string | null
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

type AbsenceProfileLite = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: "beginner" | "intermediate" | "advanced"
}

type AbsenceSessionLite = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

export type AbsenceRow = AbsenceBaseRow & {
  user: AbsenceProfileLite | null
  reviewer: AbsenceProfileLite | null
  session: AbsenceSessionLite | null
}

function isMissingTableOrColumnError(message: string) {
  const lower = message.toLowerCase()
  return (
    (lower.includes("relation") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("schema cache")) ||
    (lower.includes("column") && lower.includes("does not exist"))
  )
}

export function isLegacyAbsenceGroupIdRequiredError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("null value in column") &&
    lower.includes("group_id") &&
    lower.includes("relation") &&
    lower.includes("absence_requests")
  )
}

export async function resolveLegacyAbsenceGroupId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const fromAbsences = await supabase
    .from("absence_requests")
    .select("group_id")
    .not("group_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (!fromAbsences.error) {
    const candidate = (fromAbsences.data as { group_id?: unknown } | null)?.group_id
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate
    }
  } else if (!isMissingTableOrColumnError(fromAbsences.error.message)) {
    return null
  }

  const fromSessions = await supabase
    .from("sessions")
    .select("group_id")
    .not("group_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (!fromSessions.error) {
    const candidate = (fromSessions.data as { group_id?: unknown } | null)?.group_id
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate
    }
  } else if (!isMissingTableOrColumnError(fromSessions.error.message)) {
    return null
  }

  const fromGroups = await supabase
    .from("groups")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (!fromGroups.error) {
    const candidate = (fromGroups.data as { id?: unknown } | null)?.id
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate
    }
  }

  return null
}

export async function hydrateAbsenceRelations(
  supabase: SupabaseClient<Database>,
  rows: AbsenceBaseRow[] | null | undefined
) {
  const baseRows = rows ?? []

  const profileIds = Array.from(
    new Set(
      baseRows
        .flatMap((row) => [row.user_id, row.reviewed_by ?? ""])
        .filter((value) => !!value)
    )
  )
  const sessionIds = Array.from(
    new Set(baseRows.map((row) => row.session_id).filter((value) => !!value))
  )

  const [profilesResult, sessionsResult] = await Promise.all([
    profileIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, first_name, last_name, pseudo, photo_url, english_level")
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length > 0
      ? supabase
          .from("sessions")
          .select("id, date, start_time, end_time, status")
          .in("id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (profilesResult.error) {
    return { ok: false as const, error: profilesResult.error.message }
  }

  if (sessionsResult.error) {
    return { ok: false as const, error: sessionsResult.error.message }
  }

  const profileMap = new Map<string, AbsenceProfileLite>()
  for (const profile of profilesResult.data ?? []) {
    profileMap.set(profile.id, profile)
  }

  const sessionMap = new Map<string, AbsenceSessionLite>()
  for (const session of sessionsResult.data ?? []) {
    sessionMap.set(session.id, session)
  }

  return {
    ok: true as const,
    data: baseRows.map((row) => ({
      ...row,
      user: profileMap.get(row.user_id) ?? null,
      reviewer: row.reviewed_by ? profileMap.get(row.reviewed_by) ?? null : null,
      session: sessionMap.get(row.session_id) ?? null,
    })),
  }
}

export function mapAbsenceError(message: string) {
  const withDevDetails = (friendlyMessage: string, includeDetails = true) => {
    if (process.env.NODE_ENV !== "production") {
      return includeDetails ? `${friendlyMessage} Detail: ${message}` : friendlyMessage
    }
    return friendlyMessage
  }

  const lower = message.toLowerCase()

  if (
    (lower.includes("relation \"public.absence_requests\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("absence_requests"))
  ) {
    return withDevDetails(
      "La table `absence_requests` est absente. Execute `037_create_absence_requests.sql` puis `038_rls_absence_requests.sql`."
    )
  }

  if (lower.includes("schema cache") && lower.includes("absence_requests")) {
    return withDevDetails(
      "Le schema Supabase n'est pas a jour pour les absences. Execute `NOTIFY pgrst, 'reload schema';` puis recharge."
    )
  }

  if (lower.includes("column") && lower.includes("absence_requests")) {
    return withDevDetails(
      "Le schema phase 7 est incomplet. Reexecute `037_create_absence_requests.sql` puis `038_rls_absence_requests.sql`."
    )
  }

  if (
    lower.includes("absence_requests_unique_member_per_session") ||
    lower.includes("absence_requests_unique_user_per_session")
  ) {
    return withDevDetails("Une demande d'absence existe deja pour cette seance.", false)
  }

  if (
    lower.includes("absence_requests_status_check") ||
    lower.includes("absence_requests_review_state_check")
  ) {
    return withDevDetails("Le statut de la demande d'absence est invalide.", false)
  }

  if (lower.includes("row-level security")) {
    return withDevDetails("Permissions insuffisantes pour cette action sur les absences.")
  }

  if (isLegacyAbsenceGroupIdRequiredError(message)) {
    return withDevDetails(
      "Votre base utilise encore `absence_requests.group_id` obligatoire (schema legacy). Execute `042_fix_absence_requests_legacy_group_id.sql` puis `NOTIFY pgrst, 'reload schema';`."
    )
  }

  const fromSessions = mapSessionsError(message)
  if (fromSessions !== message) {
    return withDevDetails(fromSessions)
  }

  return withDevDetails(message)
}
