import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

type DayName = (typeof DAY_ORDER)[number]
type Frequency = "weekly" | "biweekly" | "monthly"

type AppConfigRow = {
  schedule_days: string[] | null
  start_time: string | null
  end_time: string | null
  frequency: string | null
}

type SessionLookupRow = {
  date: string
  start_time: string
}

type ScheduleInput = {
  scheduleDays: string[]
  startTime: string
  endTime: string
  frequency: Frequency
}

type NormalizedSchedule = {
  scheduleDays: DayName[]
  startTime: string
  endTime: string
  frequency: Frequency
}

type EnsureScheduledSessionsInput = {
  supabase: SupabaseClient<Database>
  createdBy: string
  schedule?: ScheduleInput
}

type EnsureScheduledSessionsResult =
  | { ok: true; created: number }
  | { ok: false; error: string }

type ReprogramUpcomingSessionsResult =
  | { ok: true; updated: number; created: number; upcomingCount: number }
  | { ok: false; error: string }

type SessionInsertBaseRow = {
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  notes: string | null
  topic_id?: string | null
  created_by: string
}

const INDEX_TO_DAY: Record<number, DayName> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function atStartOfDay(input: Date) {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate())
}

function getMondayOfWeek(input: Date) {
  const current = atStartOfDay(input)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + diffToMonday)
  return current
}

function normalizeDays(input: string[] | null | undefined) {
  const set = new Set<DayName>()
  for (const raw of input ?? []) {
    if ((DAY_ORDER as readonly string[]).includes(raw)) {
      set.add(raw as DayName)
    }
  }

  const ordered = DAY_ORDER.filter((day) => set.has(day))
  return ordered.length > 0 ? ordered : (["saturday"] as DayName[])
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback
  }
  return value.slice(0, 5)
}

function normalizeFrequency(value: string | null | undefined): Frequency {
  if (value === "biweekly" || value === "monthly") {
    return value
  }
  return "weekly"
}

function isValidTimeRange(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime
    .split(":")
    .map((part) => Number.parseInt(part, 10))
  const [endHour, endMinute] = endTime
    .split(":")
    .map((part) => Number.parseInt(part, 10))

  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  return end > start
}

function isMissingTableOrColumnError(message: string) {
  const lower = message.toLowerCase()
  return (
    (lower.includes("relation") && lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("schema cache")) ||
    (lower.includes("column") && lower.includes("does not exist"))
  )
}

function isLegacyGroupIdRequiredError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("null value in column") &&
    lower.includes("group_id") &&
    lower.includes("relation") &&
    lower.includes("sessions")
  )
}

async function resolveLegacySessionGroupId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
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
  } else if (!isMissingTableOrColumnError(fromGroups.error.message)) {
    return null
  }

  const fromConfig = await supabase
    .from("app_config")
    .select("group_id")
    .eq("id", APP_CONFIG_SINGLETON_ID)
    .maybeSingle()

  if (!fromConfig.error) {
    const candidate = (fromConfig.data as { group_id?: unknown } | null)?.group_id
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate
    }
  }

  return null
}

export function mapSessionsLegacyGroupError(message: string) {
  if (!isLegacyGroupIdRequiredError(message)) {
    return message
  }

  return "Votre base utilise encore `sessions.group_id` obligatoire (schema legacy). Execute `021_fix_sessions_legacy_group_id.sql` puis `NOTIFY pgrst, 'reload schema';`."
}

async function insertSessionRowsWithLegacySupport(
  supabase: SupabaseClient<Database>,
  rows: SessionInsertBaseRow[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const firstAttempt = await supabase.from("sessions").insert(rows)
  if (!firstAttempt.error) {
    return { ok: true }
  }

  const firstMessage = firstAttempt.error.message
  if (!isLegacyGroupIdRequiredError(firstMessage)) {
    return { ok: false, error: firstMessage }
  }

  const fallbackGroupId = await resolveLegacySessionGroupId(supabase)
  if (!fallbackGroupId) {
    return { ok: false, error: mapSessionsLegacyGroupError(firstMessage) }
  }

  const rowsWithGroup = rows.map((row) => ({
    ...row,
    group_id: fallbackGroupId,
  }))

  const retry = await supabase
    .from("sessions")
    .insert(rowsWithGroup as unknown as Database["public"]["Tables"]["sessions"]["Insert"][])

  if (retry.error) {
    return { ok: false, error: mapSessionsLegacyGroupError(retry.error.message) }
  }

  return { ok: true }
}

export async function insertSingleSessionWithLegacySupport<T>({
  supabase,
  row,
  select,
}: {
  supabase: SupabaseClient<Database>
  row: SessionInsertBaseRow
  select: string
}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const firstAttempt = await supabase
    .from("sessions")
    .insert(row)
    .select(select)
    .single<T>()

  if (!firstAttempt.error && firstAttempt.data) {
    return { ok: true, data: firstAttempt.data }
  }

  const firstMessage = firstAttempt.error?.message ?? "Creation de seance impossible."
  if (!isLegacyGroupIdRequiredError(firstMessage)) {
    return { ok: false, error: firstMessage }
  }

  const fallbackGroupId = await resolveLegacySessionGroupId(supabase)
  if (!fallbackGroupId) {
    return { ok: false, error: mapSessionsLegacyGroupError(firstMessage) }
  }

  const rowWithGroup = {
    ...row,
    group_id: fallbackGroupId,
  }

  const retry = await supabase
    .from("sessions")
    .insert(
      rowWithGroup as unknown as Database["public"]["Tables"]["sessions"]["Insert"]
    )
    .select(select)
    .single<T>()

  if (retry.error || !retry.data) {
    return {
      ok: false,
      error: mapSessionsLegacyGroupError(
        retry.error?.message ?? "Creation de seance impossible."
      ),
    }
  }

  return { ok: true, data: retry.data }
}

function getDefaultWantedCount(frequency: Frequency) {
  return frequency === "monthly" ? 8 : 12
}

function buildFutureDates(
  days: DayName[],
  frequency: Frequency,
  minimumCount?: number
) {
  const results: string[] = []
  const daySet = new Set<DayName>(days)
  const start = atStartOfDay(new Date())
  const anchorMonday = getMondayOfWeek(start)
  const monthlyKeys = new Set<string>()

  const wantedCount = Math.max(getDefaultWantedCount(frequency), minimumCount ?? 0)
  const maxDays =
    frequency === "monthly"
      ? Math.max(400, wantedCount * 62)
      : frequency === "biweekly"
        ? Math.max(200, wantedCount * 20)
        : Math.max(90, wantedCount * 10)

  for (let offset = 0; offset <= maxDays && results.length < wantedCount; offset += 1) {
    const current = new Date(start)
    current.setDate(start.getDate() + offset)

    const dayName = INDEX_TO_DAY[current.getDay()]
    if (!daySet.has(dayName)) {
      continue
    }

    if (frequency === "biweekly") {
      const currentWeek = getMondayOfWeek(current)
      const weekDiff = Math.floor(
        (currentWeek.getTime() - anchorMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      if (weekDiff % 2 !== 0) {
        continue
      }
    }

    if (frequency === "monthly") {
      const monthKey = `${current.getFullYear()}-${current.getMonth()}-${dayName}`
      if (monthlyKeys.has(monthKey)) {
        continue
      }
      monthlyKeys.add(monthKey)
    }

    results.push(formatLocalDate(current))
  }

  return results
}

async function readScheduleFromConfig(
  supabase: SupabaseClient<Database>
): Promise<{ ok: true; schedule: NormalizedSchedule } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("app_config")
    .select("schedule_days, start_time, end_time, frequency")
    .eq("id", APP_CONFIG_SINGLETON_ID)
    .maybeSingle<AppConfigRow>()

  if (error) {
    return { ok: false, error: error.message }
  }

  const scheduleDays = normalizeDays(data?.schedule_days)
  const startTime = normalizeTime(data?.start_time, "18:00")
  const endTime = normalizeTime(data?.end_time, "20:00")
  const frequency = normalizeFrequency(data?.frequency)

  return {
    ok: true,
    schedule: {
      scheduleDays,
      startTime,
      endTime,
      frequency,
    },
  }
}

export async function ensureScheduledSessions(
  input: EnsureScheduledSessionsInput
): Promise<EnsureScheduledSessionsResult> {
  const scheduleResult: { ok: true; schedule: NormalizedSchedule } | { ok: false; error: string } =
    input.schedule
    ? {
        ok: true as const,
        schedule: {
          scheduleDays: normalizeDays(input.schedule.scheduleDays),
          startTime: normalizeTime(input.schedule.startTime, "18:00"),
          endTime: normalizeTime(input.schedule.endTime, "20:00"),
          frequency: normalizeFrequency(input.schedule.frequency),
        },
      }
    : await readScheduleFromConfig(input.supabase)

  if (!scheduleResult.ok) {
    return scheduleResult
  }

  const schedule = scheduleResult.schedule
  if (!isValidTimeRange(schedule.startTime, schedule.endTime)) {
    return { ok: false, error: "Plage horaire invalide dans app_config." }
  }

  const futureDates = buildFutureDates(schedule.scheduleDays, schedule.frequency)
  if (futureDates.length === 0) {
    return { ok: true, created: 0 }
  }

  const { data: existingData, error: existingError } = await input.supabase
    .from("sessions")
    .select("date, start_time")
    .in("date", futureDates)
    .eq("status", "upcoming")

  if (existingError) {
    return { ok: false, error: existingError.message }
  }

  const existingSet = new Set(
    ((existingData ?? []) as SessionLookupRow[]).map(
      (row) => `${row.date}|${normalizeTime(row.start_time, schedule.startTime)}`
    )
  )

  const rowsToInsert = futureDates
    .filter((date) => !existingSet.has(`${date}|${schedule.startTime}`))
    .map((date) => ({
      date,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      status: "upcoming" as const,
      notes: null as string | null,
      created_by: input.createdBy,
    }))

  if (rowsToInsert.length === 0) {
    return { ok: true, created: 0 }
  }

  const insertResult = await insertSessionRowsWithLegacySupport(
    input.supabase,
    rowsToInsert
  )
  if (!insertResult.ok) {
    return insertResult
  }

  return { ok: true, created: rowsToInsert.length }
}

export async function reprogramUpcomingSessions(
  input: EnsureScheduledSessionsInput
): Promise<ReprogramUpcomingSessionsResult> {
  const scheduleResult: { ok: true; schedule: NormalizedSchedule } | { ok: false; error: string } =
    input.schedule
      ? {
          ok: true as const,
          schedule: {
            scheduleDays: normalizeDays(input.schedule.scheduleDays),
            startTime: normalizeTime(input.schedule.startTime, "18:00"),
            endTime: normalizeTime(input.schedule.endTime, "20:00"),
            frequency: normalizeFrequency(input.schedule.frequency),
          },
        }
      : await readScheduleFromConfig(input.supabase)

  if (!scheduleResult.ok) {
    return scheduleResult
  }

  const schedule = scheduleResult.schedule
  if (!isValidTimeRange(schedule.startTime, schedule.endTime)) {
    return { ok: false, error: "Plage horaire invalide dans app_config." }
  }

  const { data: existingData, error: existingError } = await input.supabase
    .from("sessions")
    .select("id, date, start_time, end_time")
    .eq("status", "upcoming")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })

  if (existingError) {
    return { ok: false, error: existingError.message }
  }

  const existingUpcoming = (existingData ?? []) as Array<{
    id: string
    date: string
    start_time: string
    end_time: string
  }>

  const targetDates = buildFutureDates(
    schedule.scheduleDays,
    schedule.frequency,
    existingUpcoming.length
  )

  if (targetDates.length < existingUpcoming.length) {
    return {
      ok: false,
      error: "Impossible de generer assez de dates pour reprogrammer les seances a venir.",
    }
  }

  let updated = 0
  for (const [index, session] of existingUpcoming.entries()) {
    const targetDate = targetDates[index]
    const targetStart = schedule.startTime
    const targetEnd = schedule.endTime

    const currentStart = normalizeTime(session.start_time, targetStart)
    const currentEnd = normalizeTime(session.end_time, targetEnd)
    const mustUpdate =
      session.date !== targetDate || currentStart !== targetStart || currentEnd !== targetEnd

    if (!mustUpdate) {
      continue
    }

    const { error: updateError } = await input.supabase
      .from("sessions")
      .update({
        date: targetDate,
        start_time: targetStart,
        end_time: targetEnd,
      })
      .eq("id", session.id)

    if (updateError) {
      return { ok: false, error: updateError.message }
    }

    updated += 1
  }

  const rowsToInsert = targetDates
    .slice(existingUpcoming.length)
    .map((date) => ({
      date,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      status: "upcoming" as const,
      notes: null as string | null,
      created_by: input.createdBy,
    }))

  if (rowsToInsert.length > 0) {
    const insertResult = await insertSessionRowsWithLegacySupport(
      input.supabase,
      rowsToInsert
    )
    if (!insertResult.ok) {
      return insertResult
    }
  }

  return {
    ok: true,
    updated,
    created: rowsToInsert.length,
    upcomingCount: Math.max(existingUpcoming.length, targetDates.length),
  }
}
