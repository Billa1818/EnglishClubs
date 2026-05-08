import { mapSessionsError } from "../sessions/_shared"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export const ATTENDANCE_SELECT =
  "id, session_id, user_id, status, declared_at, confirmed_at, confirmed_by, created_at, updated_at"

export const ATTENDANCE_SELECT_LITE =
  "id, session_id, user_id, status, created_at"

export const ATTENDANCE_SELECT_MINIMAL =
  "id, session_id, user_id, status"

export type AttendanceBaseRow = {
  id: string
  session_id: string
  user_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
  declared_at: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  created_at: string
  updated_at: string
}

export type AttendanceLiteRow = {
  id: string
  session_id: string
  user_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
  created_at: string
}

export type AttendanceMinimalRow = {
  id: string
  session_id: string
  user_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
}

type AttendanceProfileLite = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: "beginner" | "intermediate" | "advanced"
}

export type AttendanceRow = {
  id: string
  session_id: string
  user_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
  declared_at: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  created_at: string
  updated_at: string
  user: AttendanceProfileLite | null
  confirmer: AttendanceProfileLite | null
}

export function normalizeAttendanceRows(
  rows:
    | AttendanceBaseRow[]
    | AttendanceLiteRow[]
    | AttendanceMinimalRow[]
    | null
    | undefined
): AttendanceBaseRow[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    session_id: row.session_id,
    user_id: row.user_id,
    status: row.status,
    declared_at: "declared_at" in row ? row.declared_at ?? null : null,
    confirmed_at: "confirmed_at" in row ? row.confirmed_at ?? null : null,
    confirmed_by: "confirmed_by" in row ? row.confirmed_by ?? null : null,
    created_at: "created_at" in row ? row.created_at : "",
    updated_at: "updated_at" in row ? row.updated_at : ("created_at" in row ? row.created_at : ""),
  }))
}

export function shouldFallbackToLiteAttendanceSelect(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("column") &&
    lower.includes("attendances") &&
    (lower.includes("declared_at") ||
      lower.includes("confirmed_at") ||
      lower.includes("confirmed_by") ||
      lower.includes("updated_at") ||
      lower.includes("created_at"))
  )
}

export function shouldFallbackToMinimalAttendanceSelect(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("column") &&
    lower.includes("attendances") &&
    lower.includes("created_at")
  )
}

export function shouldFallbackToAttendanceInsertWithoutDeclaredAt(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("column") &&
    lower.includes("attendances") &&
    lower.includes("declared_at")
  )
}

function isMissingTableOrColumnError(message: string) {
  const lower = message.toLowerCase()
  return (
    (lower.includes("relation") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("schema cache")) ||
    (lower.includes("column") && lower.includes("does not exist"))
  )
}

export function isLegacyAttendanceGroupIdRequiredError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("null value in column") &&
    lower.includes("group_id") &&
    lower.includes("relation") &&
    lower.includes("attendances")
  )
}

export async function resolveLegacyAttendanceGroupId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const fromAttendances = await supabase
    .from("attendances")
    .select("group_id")
    .not("group_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (!fromAttendances.error) {
    const candidate = (fromAttendances.data as { group_id?: unknown } | null)?.group_id
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate
    }
  } else if (!isMissingTableOrColumnError(fromAttendances.error.message)) {
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

export async function hydrateAttendancesProfiles(
  supabase: SupabaseClient<Database>,
  rows: AttendanceBaseRow[] | null | undefined
) {
  const baseRows = rows ?? []

  const profileIds = Array.from(
    new Set(
      baseRows
        .flatMap((row) => [row.user_id, row.confirmed_by ?? ""])
        .filter((value) => !!value)
    )
  )

  if (profileIds.length === 0) {
    return {
      ok: true as const,
      data: baseRows.map((row) => ({
        ...row,
        user: null,
        confirmer: null,
      })),
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, pseudo, photo_url, english_level")
    .in("id", profileIds)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const profileMap = new Map<string, AttendanceProfileLite>()
  for (const profile of data ?? []) {
    profileMap.set(profile.id, profile)
  }

  return {
    ok: true as const,
    data: baseRows.map((row) => ({
      ...row,
      user: profileMap.get(row.user_id) ?? null,
      confirmer: row.confirmed_by ? profileMap.get(row.confirmed_by) ?? null : null,
    })),
  }
}

export function mapAttendanceError(message: string) {
  const withDevDetails = (friendlyMessage: string) => {
    if (process.env.NODE_ENV !== "production") {
      return `${friendlyMessage} Detail: ${message}`
    }
    return friendlyMessage
  }

  const fromSessions = mapSessionsError(message)
  if (fromSessions !== message) {
    return withDevDetails(fromSessions)
  }

  const lower = message.toLowerCase()

  if (
    (lower.includes("relation \"public.attendances\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("attendances"))
  ) {
    return withDevDetails(
      "La table `attendances` est absente. Execute `035_create_attendances.sql` puis `036_rls_attendances.sql`."
    )
  }

  if (
    lower.includes("schema cache") &&
    lower.includes("attendances")
  ) {
    return withDevDetails(
      "Le schema Supabase n'est pas a jour pour les presences. Execute `NOTIFY pgrst, 'reload schema';`."
    )
  }

  if (
    lower.includes("column") &&
    lower.includes("attendances")
  ) {
    return withDevDetails(
      "Le schema phase 6 est incomplet. Reexecute `035_create_attendances.sql` puis `036_rls_attendances.sql`."
    )
  }

  if (lower.includes("attendances_unique_member_per_session")) {
    return withDevDetails(
      "Cet utilisateur a deja une presence enregistree pour cette seance."
    )
  }

  if (isLegacyAttendanceGroupIdRequiredError(message)) {
    return withDevDetails(
      "Votre base utilise encore `attendances.group_id` obligatoire (schema legacy). Execute `041_fix_attendances_legacy_group_id.sql` puis `NOTIFY pgrst, 'reload schema';`."
    )
  }

  return withDevDetails(message)
}
