import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import {
  hydrateSelectionsUsers,
  isActiveMember,
  mapSelectionError,
  SELECTION_SELECT,
} from "@/app/api/selection/_shared"

type ActivityRow = {
  id: string
  name: string
  category: "ice_breaker" | "vocabulary" | "conversation" | "comprehension" | "writing"
  selection_mode: "automatic" | "manual" | "semi-automatic"
  members_required: number
  is_archived: boolean
}

type CycleRow = {
  id: string
  activity_id: string
  started_at: string
  ended_at: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

type ActiveMemberRow = {
  user_id: string
  profile: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: "beginner" | "intermediate" | "advanced"
  } | null
}

type SelectionRow = {
  id: string
  cycle_id: string
  user_id: string
  session_id: string
  session_activity_id: string
  counts_in_cycle: boolean
  selection_mode: "automatic" | "manual" | "semi-automatic"
  selected_by: string | null
  selected_at: string
  created_at: string
  updated_at: string
}

export async function GET(_request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const [{ data: activities, error: activitiesError }, { data: activeMembers, error: membersError }] =
      await Promise.all([
        supabase
          .from("activities")
          .select("id, name, category, selection_mode, members_required, is_archived")
          .in("selection_mode", ["automatic", "semi-automatic"])
          .eq("is_archived", false)
          .order("name", { ascending: true }),
        supabase
          .from("members")
          .select(
            "user_id, profile:profiles!members_user_id_fkey(id, first_name, last_name, pseudo, photo_url, english_level)"
          )
          .eq("status", "active")
          .order("joined_at", { ascending: true }),
      ])

    if (activitiesError) {
      return NextResponse.json(
        { error: mapSelectionError(activitiesError.message) },
        { status: 500 }
      )
    }

    if (membersError) {
      return NextResponse.json(
        { error: mapSelectionError(membersError.message) },
        { status: 500 }
      )
    }

    const activityRows = (activities ?? []) as ActivityRow[]
    const memberRows = (activeMembers ?? []) as ActiveMemberRow[]

    if (activityRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          stats: {
            activitiesWithSelection: 0,
            activeCycles: 0,
            eligibleMembers: memberRows.length,
            totalSelections: 0,
          },
          activities: [],
          members: memberRows
            .map((item) => item.profile)
            .filter(
              (profile): profile is NonNullable<ActiveMemberRow["profile"]> => !!profile
            ),
          matrix: [],
        },
      })
    }

    const activityIds = activityRows.map((activity) => activity.id)

    const { data: cycles, error: cyclesError } = await supabase
      .from("activity_selection_cycles")
      .select("id, activity_id, started_at, ended_at, is_active, created_by, created_at, updated_at")
      .in("activity_id", activityIds)
      .order("started_at", { ascending: false })

    if (cyclesError) {
      return NextResponse.json(
        { error: mapSelectionError(cyclesError.message) },
        { status: 500 }
      )
    }

    const cycleRows = (cycles ?? []) as CycleRow[]
    const cycleIds = cycleRows.map((cycle) => cycle.id)

    let hydratedSelections: Array<
      SelectionRow & {
        user: {
          id: string
          first_name: string
          last_name: string
          pseudo: string
          photo_url: string | null
          english_level: "beginner" | "intermediate" | "advanced"
        } | null
      }
    > = []

    if (cycleIds.length > 0) {
      const { data: selections, error: selectionsError } = await supabase
        .from("activity_selections")
        .select(SELECTION_SELECT)
        .in("cycle_id", cycleIds)
        .order("selected_at", { ascending: true })
        .limit(5000)

      if (selectionsError) {
        return NextResponse.json(
          { error: mapSelectionError(selectionsError.message) },
          { status: 500 }
        )
      }

      const selectionRows = (selections ?? []) as SelectionRow[]
      const hydratedSelectionsResult = await hydrateSelectionsUsers<SelectionRow>(
        supabase,
        selectionRows
      )
      if (!hydratedSelectionsResult.ok) {
        return NextResponse.json(
          { error: mapSelectionError(hydratedSelectionsResult.error) },
          { status: 500 }
        )
      }

      hydratedSelections = hydratedSelectionsResult.data
    }

    const cyclesByActivity = new Map<string, CycleRow[]>()
    for (const cycle of cycleRows) {
      const current = cyclesByActivity.get(cycle.activity_id) ?? []
      current.push(cycle)
      cyclesByActivity.set(cycle.activity_id, current)
    }

    const selectionsByCycle = new Map<string, typeof hydratedSelections>()
    for (const selection of hydratedSelections) {
      const current = selectionsByCycle.get(selection.cycle_id) ?? []
      current.push(selection)
      selectionsByCycle.set(selection.cycle_id, current)
    }

    const activeProfiles = memberRows
      .map((item) => item.profile)
      .filter((profile): profile is NonNullable<ActiveMemberRow["profile"]> => !!profile)

    const summaryByActivity = activityRows.map((activity) => {
      const cyclesForActivity = cyclesByActivity.get(activity.id) ?? []
      const activeCycle = cyclesForActivity.find((cycle) => cycle.is_active) ?? null
      const cycleIdsForActivity = new Set(cyclesForActivity.map((cycle) => cycle.id))
      const selectionsForActivity = hydratedSelections.filter((selection) =>
        cycleIdsForActivity.has(selection.cycle_id)
      )

      const countsByUser = new Map<string, number>()
      for (const selection of selectionsForActivity) {
        if (!selection.counts_in_cycle) {
          continue
        }
        countsByUser.set(selection.user_id, (countsByUser.get(selection.user_id) ?? 0) + 1)
      }

      const activeCycleSelections = activeCycle
        ? selectionsByCycle.get(activeCycle.id) ?? []
        : []
      const activeCycleCountedUsers = new Set(
        activeCycleSelections
          .filter((selection) => selection.counts_in_cycle)
          .map((selection) => selection.user_id)
      )

      const progressPercent =
        activeProfiles.length > 0
          ? Math.min(
              100,
              Math.round((activeCycleCountedUsers.size / activeProfiles.length) * 100)
            )
          : 0

      const matrix = activeProfiles.map((profile) => ({
        userId: profile.id,
        count: countsByUser.get(profile.id) ?? 0,
      }))

      return {
        activity,
        activeCycle: activeCycle
          ? {
              ...activeCycle,
              countedSelectionCount: activeCycleCountedUsers.size,
              progressPercent,
            }
          : null,
        cyclesCount: cyclesForActivity.length,
        recentSelections: [...selectionsForActivity]
          .sort((left, right) => right.selected_at.localeCompare(left.selected_at))
          .slice(0, 8),
        matrix,
      }
    })

    const totalSelections = hydratedSelections.filter((selection) => selection.counts_in_cycle).length
    const activeCyclesCount = summaryByActivity.filter((item) => item.activeCycle).length

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        stats: {
          activitiesWithSelection: summaryByActivity.length,
          activeCycles: activeCyclesCount,
          eligibleMembers: activeProfiles.length,
          totalSelections,
        },
        members: activeProfiles,
        activities: summaryByActivity,
      },
    })
  } catch (error) {
    console.error("Erreur selection/summary GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
