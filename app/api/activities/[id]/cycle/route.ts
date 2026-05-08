import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import {
  getActiveCycle,
  hydrateSelectionsUsers,
  isActiveMember,
  mapSelectionError,
  SELECTION_SELECT,
} from "@/app/api/selection/_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id: activityId } = await context.params
    if (!activityId) {
      return NextResponse.json(
        { error: "Identifiant activite manquant." },
        { status: 400 }
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

    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("id, name, selection_mode, is_archived")
      .eq("id", activityId)
      .maybeSingle()

    if (activityError) {
      return NextResponse.json(
        { error: mapSelectionError(activityError.message) },
        { status: 500 }
      )
    }

    if (!activity) {
      return NextResponse.json({ error: "Activite introuvable." }, { status: 404 })
    }

    const cycleResult = await getActiveCycle(supabase, activityId)
    if (!cycleResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(cycleResult.error) },
        { status: 500 }
      )
    }

    const cycle = cycleResult.data
    if (!cycle) {
      return NextResponse.json({
        success: true,
        data: {
          activity,
          cycle: null,
        },
      })
    }

    const { data: selections, error: selectionsError } = await supabase
      .from("activity_selections")
      .select(SELECTION_SELECT)
      .eq("cycle_id", cycle.id)
      .order("selected_at", { ascending: true })

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

    const countedUserIds = new Set(
      hydratedSelectionsResult.data
        .filter((selection) => selection.counts_in_cycle)
        .map((selection) => selection.user_id)
    )

    const { count: activeMembersCount, error: membersCountError } = await supabase
      .from("members")
      .select("id", { head: true, count: "exact" })
      .eq("status", "active")

    if (membersCountError) {
      return NextResponse.json(
        { error: mapSelectionError(membersCountError.message) },
        { status: 500 }
      )
    }

    const eligibleCount = activeMembersCount ?? 0
    const countedSelectionCount = countedUserIds.size
    const progressPercent =
      eligibleCount > 0
        ? Math.min(100, Math.round((countedSelectionCount / eligibleCount) * 100))
        : 0

    return NextResponse.json({
      success: true,
      data: {
        activity,
        cycle: {
          ...cycle,
          selections: hydratedSelectionsResult.data,
          stats: {
            eligibleCount,
            countedSelectionCount,
            progressPercent,
          },
        },
      },
    })
  } catch (error) {
    console.error("Erreur activities/[id]/cycle GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
