import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type AssignmentRow = {
  user_id: string
}

type SessionActivityRow<TAssignment extends AssignmentRow = AssignmentRow> = {
  assignments: TAssignment[] | null
}

type ProfileLite = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: "beginner" | "intermediate" | "advanced"
}

function uniqueUserIdsFromActivities<TActivity extends SessionActivityRow>(
  activities: TActivity[] | null | undefined
) {
  const ids = new Set<string>()
  for (const activity of activities ?? []) {
    for (const assignment of activity.assignments ?? []) {
      if (assignment.user_id) {
        ids.add(assignment.user_id)
      }
    }
  }
  return Array.from(ids)
}

function uniqueUserIdsFromAssignments<TAssignment extends AssignmentRow>(
  assignments: TAssignment[] | null | undefined
) {
  const ids = new Set<string>()
  for (const assignment of assignments ?? []) {
    if (assignment.user_id) {
      ids.add(assignment.user_id)
    }
  }
  return Array.from(ids)
}

async function loadProfilesByIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return { ok: true as const, map: new Map<string, ProfileLite>() }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, pseudo, photo_url, english_level")
    .in("id", userIds)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const map = new Map<string, ProfileLite>()
  for (const profile of data ?? []) {
    map.set(profile.id, {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      pseudo: profile.pseudo,
      photo_url: profile.photo_url,
      english_level: profile.english_level,
    })
  }

  return { ok: true as const, map }
}

export async function hydrateSessionActivitiesAssignmentsUsers<
  TAssignment extends AssignmentRow,
  TActivity extends SessionActivityRow<TAssignment>,
>(supabase: SupabaseClient<Database>, activities: TActivity[] | null | undefined) {
  const userIds = uniqueUserIdsFromActivities(activities)
  const profilesResult = await loadProfilesByIds(supabase, userIds)
  if (!profilesResult.ok) {
    return profilesResult
  }

  const enriched = (activities ?? []).map((activity) => ({
    ...activity,
    assignments: (activity.assignments ?? []).map((assignment) => ({
      ...assignment,
      user: profilesResult.map.get(assignment.user_id) ?? null,
    })),
  })) as TActivity[]

  return { ok: true as const, data: enriched }
}

export async function hydrateAssignmentsUsers<TAssignment extends AssignmentRow>(
  supabase: SupabaseClient<Database>,
  assignments: TAssignment[] | null | undefined
) {
  const userIds = uniqueUserIdsFromAssignments(assignments)
  const profilesResult = await loadProfilesByIds(supabase, userIds)
  if (!profilesResult.ok) {
    return profilesResult
  }

  const enriched = (assignments ?? []).map((assignment) => ({
    ...assignment,
    user: profilesResult.map.get(assignment.user_id) ?? null,
  }))

  return { ok: true as const, data: enriched }
}
