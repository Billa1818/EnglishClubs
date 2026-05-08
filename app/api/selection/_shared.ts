import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { mapSessionsError, isActiveAdmin, isActiveMember } from "../sessions/_shared"

export { isActiveAdmin, isActiveMember }

export const CYCLE_SELECT =
  "id, activity_id, started_at, ended_at, is_active, created_by, created_at, updated_at"

export const SELECTION_SELECT =
  "id, cycle_id, user_id, session_id, session_activity_id, counts_in_cycle, selection_mode, selected_by, selected_at, created_at, updated_at"

type SelectionWithUserId = {
  user_id: string
}

type ProfileLite = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: "beginner" | "intermediate" | "advanced"
}

export function mapSelectionError(message: string) {
  const fromSessions = mapSessionsError(message)
  if (fromSessions !== message) {
    return fromSessions
  }

  const lower = message.toLowerCase()

  if (
    (lower.includes("relation \"public.activity_selection_cycles\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("activity_selection_cycles"))
  ) {
    return "La table `activity_selection_cycles` est absente. Execute `022_create_activity_selection_cycles.sql`."
  }

  if (
    (lower.includes("relation \"public.activity_selections\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("activity_selections"))
  ) {
    return "La table `activity_selections` est absente. Execute `023_create_activity_selections.sql`."
  }

  if (
    lower.includes("schema cache") &&
    (lower.includes("activity_selection_cycles") || lower.includes("activity_selections"))
  ) {
    return "Le schema Supabase n'est pas a jour pour la phase 8. Execute les scripts SQL 022 a 024 puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    lower.includes("column") &&
    (lower.includes("activity_selection_cycles") || lower.includes("activity_selections"))
  ) {
    return "Le schema phase 8 est incomplet. Reexecute les scripts SQL 022 a 024."
  }

  if (lower.includes("relation") && lower.includes("activities")) {
    return "La table `activities` est absente. Execute les scripts SQL de la phase 4."
  }

  if (lower.includes("relation") && lower.includes("members")) {
    return "La table `members` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("relation") && lower.includes("profiles")) {
    return "La table `profiles` est absente. Execute les scripts SQL de la phase 1."
  }

  return message
}

export async function getActiveCycle(
  supabase: SupabaseClient<Database>,
  activityId: string
) {
  const { data, error } = await supabase
    .from("activity_selection_cycles")
    .select(CYCLE_SELECT)
    .eq("activity_id", activityId)
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(1)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return {
    ok: true as const,
    data: (data ?? [])[0] ?? null,
  }
}

export async function closeCycle(
  supabase: SupabaseClient<Database>,
  cycleId: string
) {
  const { error } = await supabase
    .from("activity_selection_cycles")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", cycleId)
    .eq("is_active", true)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const }
}

export async function createActiveCycle(
  supabase: SupabaseClient<Database>,
  options: {
    activityId: string
    createdBy?: string
  }
) {
  const { data, error } = await supabase
    .from("activity_selection_cycles")
    .insert({
      activity_id: options.activityId,
      is_active: true,
      started_at: new Date().toISOString(),
      created_by: options.createdBy ?? null,
    })
    .select(CYCLE_SELECT)
    .single()

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const, data }
}

export async function getOrCreateActiveCycle(
  supabase: SupabaseClient<Database>,
  options: {
    activityId: string
    createdBy?: string
  }
) {
  const currentCycleResult = await getActiveCycle(supabase, options.activityId)
  if (!currentCycleResult.ok) {
    return currentCycleResult
  }

  if (currentCycleResult.data) {
    return { ok: true as const, data: currentCycleResult.data, created: false as const }
  }

  const createdCycleResult = await createActiveCycle(supabase, options)
  if (!createdCycleResult.ok) {
    return createdCycleResult
  }

  return { ok: true as const, data: createdCycleResult.data, created: true as const }
}

export async function hydrateSelectionsUsers<TSelection extends SelectionWithUserId>(
  supabase: SupabaseClient<Database>,
  selections: TSelection[] | null | undefined
) {
  const selectionRows = selections ?? []
  const userIds = Array.from(new Set(selectionRows.map((item) => item.user_id).filter(Boolean)))

  if (userIds.length === 0) {
    return { ok: true as const, data: selectionRows.map((item) => ({ ...item, user: null })) }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, pseudo, photo_url, english_level")
    .in("id", userIds)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const profileMap = new Map<string, ProfileLite>()
  for (const profile of data ?? []) {
    profileMap.set(profile.id, profile)
  }

  return {
    ok: true as const,
    data: selectionRows.map((item) => ({
      ...item,
      user: profileMap.get(item.user_id) ?? null,
    })),
  }
}

