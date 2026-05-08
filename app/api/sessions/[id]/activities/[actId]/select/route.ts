import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import {
  getEligibleUserIds,
  normalizeSelectionCount,
  normalizeUserIds,
  pickRandomUserIds,
  type SelectionMode,
} from "@/lib/selection-algorithm"
import { sessionActivitySelectSchema } from "@/lib/validations/phase8"
import {
  closeCycle,
  createActiveCycle,
  getOrCreateActiveCycle,
  hydrateSelectionsUsers,
  isActiveAdmin,
  mapSelectionError,
  SELECTION_SELECT,
} from "@/app/api/selection/_shared"
import { hydrateAssignmentsUsers } from "../../../../_assignment-profiles"

type RouteContext = {
  params: Promise<{
    id: string
    actId: string
  }>
}

const ASSIGNMENT_SELECT =
  "id, session_activity_id, user_id, assignment_type, reason, assigned_at, assigned_by"

function resolveSelectionMode(
  payloadMode: SelectionMode | undefined,
  activityMode: "automatic" | "manual" | "semi-automatic"
): SelectionMode {
  return payloadMode ?? activityMode
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id: sessionId, actId } = await context.params
    if (!sessionId || !actId) {
      return NextResponse.json(
        { error: "Identifiants manquants." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = sessionActivitySelectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Donnees invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const payload = validation.data
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

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const [{ data: session, error: sessionError }, { data: sessionActivity, error: sessionActivityError }] =
      await Promise.all([
        supabase
          .from("sessions")
          .select("id, status")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("session_activities")
          .select(
            "id, session_id, activity_id, activity:activities(id, name, selection_mode, members_required, is_archived)"
          )
          .eq("id", actId)
          .eq("session_id", sessionId)
          .maybeSingle(),
      ])

    if (sessionError) {
      return NextResponse.json(
        { error: mapSelectionError(sessionError.message) },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (session.status !== "upcoming" && session.status !== "ongoing") {
      return NextResponse.json(
        {
          error:
            "Selection impossible: seules les seances a venir ou en cours sont autorisees.",
        },
        { status: 400 }
      )
    }

    if (sessionActivityError) {
      return NextResponse.json(
        { error: mapSelectionError(sessionActivityError.message) },
        { status: 500 }
      )
    }

    if (!sessionActivity || !sessionActivity.activity) {
      return NextResponse.json(
        { error: "Activite de seance introuvable." },
        { status: 404 }
      )
    }

    if (sessionActivity.activity.is_archived) {
      return NextResponse.json(
        { error: "Cette activite est archivee et ne peut pas etre selectionnee." },
        { status: 400 }
      )
    }

    const mode = resolveSelectionMode(payload.mode, sessionActivity.activity.selection_mode)

    const { data: activeMembers, error: activeMembersError } = await supabase
      .from("members")
      .select("user_id")
      .eq("status", "active")

    if (activeMembersError) {
      return NextResponse.json(
        { error: mapSelectionError(activeMembersError.message) },
        { status: 500 }
      )
    }

    const activeUserIds = normalizeUserIds((activeMembers ?? []).map((item) => item.user_id))
    if (activeUserIds.length === 0) {
      return NextResponse.json(
        { error: "Aucun membre actif disponible pour la selection." },
        { status: 400 }
      )
    }

    const cycleResult = await getOrCreateActiveCycle(supabase, {
      activityId: sessionActivity.activity_id,
      createdBy: user.id,
    })
    if (!cycleResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(cycleResult.error) },
        { status: 500 }
      )
    }

    let activeCycle = cycleResult.data
    let cycleWasReset = false

    const selectedEntries: Array<{ cycleId: string; userId: string }> = []

    if (mode === "automatic") {
      const requestedCount = normalizeSelectionCount(
        payload.count,
        Math.max(sessionActivity.activity.members_required, 1),
        activeUserIds.length
      )

      const { data: countedSelections, error: countedSelectionsError } = await supabase
        .from("activity_selections")
        .select("user_id")
        .eq("cycle_id", activeCycle.id)
        .eq("counts_in_cycle", true)

      if (countedSelectionsError) {
        return NextResponse.json(
          { error: mapSelectionError(countedSelectionsError.message) },
          { status: 500 }
        )
      }

      let eligibleCurrentCycle = getEligibleUserIds({
        activeUserIds,
        alreadyCountedUserIds: normalizeUserIds(
          (countedSelections ?? []).map((item) => item.user_id)
        ),
      })

      if (eligibleCurrentCycle.length === 0) {
        const closeResult = await closeCycle(supabase, activeCycle.id)
        if (!closeResult.ok) {
          return NextResponse.json(
            { error: mapSelectionError(closeResult.error) },
            { status: 500 }
          )
        }

        const newCycleResult = await createActiveCycle(supabase, {
          activityId: sessionActivity.activity_id,
          createdBy: user.id,
        })
        if (!newCycleResult.ok) {
          return NextResponse.json(
            { error: mapSelectionError(newCycleResult.error) },
            { status: 500 }
          )
        }

        activeCycle = newCycleResult.data
        cycleWasReset = true
        eligibleCurrentCycle = [...activeUserIds]
      }

      const firstCyclePicks = pickRandomUserIds(eligibleCurrentCycle, requestedCount)
      for (const userId of firstCyclePicks) {
        selectedEntries.push({ cycleId: activeCycle.id, userId })
      }

      const remainingCount = requestedCount - firstCyclePicks.length
      if (remainingCount > 0) {
        const closeResult = await closeCycle(supabase, activeCycle.id)
        if (!closeResult.ok) {
          return NextResponse.json(
            { error: mapSelectionError(closeResult.error) },
            { status: 500 }
          )
        }

        const nextCycleResult = await createActiveCycle(supabase, {
          activityId: sessionActivity.activity_id,
          createdBy: user.id,
        })
        if (!nextCycleResult.ok) {
          return NextResponse.json(
            { error: mapSelectionError(nextCycleResult.error) },
            { status: 500 }
          )
        }

        activeCycle = nextCycleResult.data
        cycleWasReset = true

        const secondCycleEligible = getEligibleUserIds({
          activeUserIds,
          excludeUserIds: firstCyclePicks,
        })
        const secondCyclePicks = pickRandomUserIds(secondCycleEligible, remainingCount)
        for (const userId of secondCyclePicks) {
          selectedEntries.push({ cycleId: activeCycle.id, userId })
        }
      }
    } else {
      const requestedUserIds = normalizeUserIds(payload.userIds ?? [])
      if (requestedUserIds.length === 0) {
        return NextResponse.json(
          { error: "Choisis au moins un membre pour cette selection." },
          { status: 400 }
        )
      }

      const activeSet = new Set(activeUserIds)
      const inactiveIds = requestedUserIds.filter((userId) => !activeSet.has(userId))
      if (inactiveIds.length > 0) {
        return NextResponse.json(
          {
            error:
              "Certains utilisateurs ne sont pas membres actifs et ne peuvent pas etre selectionnes.",
            details: { inactiveIds },
          },
          { status: 400 }
        )
      }

      const countInCycle = payload.countInCycle ?? true
      if (countInCycle) {
        const { data: alreadyCounted, error: alreadyCountedError } = await supabase
          .from("activity_selections")
          .select("user_id")
          .eq("cycle_id", activeCycle.id)
          .eq("counts_in_cycle", true)
          .in("user_id", requestedUserIds)

        if (alreadyCountedError) {
          return NextResponse.json(
            { error: mapSelectionError(alreadyCountedError.message) },
            { status: 500 }
          )
        }

        const alreadyCountedUserIds = normalizeUserIds(
          (alreadyCounted ?? []).map((item) => item.user_id)
        )
        if (alreadyCountedUserIds.length > 0) {
          return NextResponse.json(
            {
              error:
                "Certains membres ont deja ete comptes dans ce cycle. Reinitialise le cycle ou desactive `countInCycle`.",
              details: { alreadyCountedUserIds },
            },
            { status: 409 }
          )
        }
      }

      for (const userId of requestedUserIds) {
        selectedEntries.push({ cycleId: activeCycle.id, userId })
      }
    }

    if (selectedEntries.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucun membre n'a pu etre selectionne pour cette activite avec les contraintes actuelles.",
        },
        { status: 400 }
      )
    }

    const rowsToInsert = selectedEntries.map((entry) => ({
      cycle_id: entry.cycleId,
      user_id: entry.userId,
      session_id: sessionId,
      session_activity_id: actId,
      counts_in_cycle: mode === "automatic" ? true : (payload.countInCycle ?? true),
      selection_mode: mode,
      selected_by: user.id,
    }))

    const { data: insertedSelections, error: insertSelectionsError } = await supabase
      .from("activity_selections")
      .insert(rowsToInsert)
      .select(SELECTION_SELECT)

    if (insertSelectionsError) {
      return NextResponse.json(
        { error: mapSelectionError(insertSelectionsError.message) },
        { status: 500 }
      )
    }

    const hydratedSelectionsResult = await hydrateSelectionsUsers(
      supabase,
      (insertedSelections ?? []) as Array<{ user_id: string }>
    )
    if (!hydratedSelectionsResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(hydratedSelectionsResult.error) },
        { status: 500 }
      )
    }

    const selectedUserIds = normalizeUserIds(selectedEntries.map((entry) => entry.userId))

    const { error: deleteAssignmentsError } = await supabase
      .from("session_activity_assignments")
      .delete()
      .eq("session_activity_id", actId)

    if (deleteAssignmentsError) {
      return NextResponse.json(
        { error: mapSelectionError(deleteAssignmentsError.message) },
        { status: 500 }
      )
    }

    const assignmentRows = selectedUserIds.map((selectedUserId) => ({
      session_activity_id: actId,
      user_id: selectedUserId,
      assignment_type: "participant",
      reason: `selection:${mode}`,
      assigned_by: user.id,
    }))

    const { data: assignments, error: assignmentsError } = await supabase
      .from("session_activity_assignments")
      .insert(assignmentRows)
      .select(ASSIGNMENT_SELECT)

    if (assignmentsError) {
      return NextResponse.json(
        { error: mapSelectionError(assignmentsError.message) },
        { status: 500 }
      )
    }

    const hydratedAssignmentsResult = await hydrateAssignmentsUsers(
      supabase,
      (assignments ?? []) as Array<{ user_id: string }>
    )
    if (!hydratedAssignmentsResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(hydratedAssignmentsResult.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        mode,
        cycleWasReset,
        selectedCount: selectedUserIds.length,
        selections: hydratedSelectionsResult.data,
        assignments: hydratedAssignmentsResult.data,
      },
      message: "Selection enregistree avec succes.",
    })
  } catch (error) {
    console.error("Erreur sessions/[id]/activities/[actId]/select POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

