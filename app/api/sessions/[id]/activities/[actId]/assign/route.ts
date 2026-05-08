import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { sessionActivityAssignSchema } from "@/lib/validations/phase5"
import { isActiveAdmin, mapSessionsError } from "../../../../_shared"
import { hydrateAssignmentsUsers } from "../../../../_assignment-profiles"

type RouteContext = {
  params: Promise<{
    id: string
    actId: string
  }>
}

const ASSIGNMENT_SELECT =
  "id, session_activity_id, user_id, assignment_type, reason, assigned_at, assigned_by"

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
    const validation = sessionActivityAssignSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Donnees invalides",
          details: validation.error.flatten(),
        },
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
        { error: mapSessionsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const payload = validation.data

    const uniqueAssignments = Array.from(
      new Map(
        payload.assignments.map((item) => [
          `${item.userId}::${item.assignmentType.toLowerCase()}`,
          {
            ...item,
            assignmentType: item.assignmentType.trim(),
            reason: item.reason?.trim() || null,
          },
        ])
      ).values()
    )

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", sessionId)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json(
        { error: mapSessionsError(sessionError.message) },
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
            "Modification impossible: seules les seances a venir ou en cours peuvent etre modifiees pour l'affectation.",
        },
        { status: 400 }
      )
    }

    const { data: sessionActivity, error: sessionActivityError } = await supabase
      .from("session_activities")
      .select("id")
      .eq("id", actId)
      .eq("session_id", sessionId)
      .maybeSingle()

    if (sessionActivityError) {
      return NextResponse.json(
        { error: mapSessionsError(sessionActivityError.message) },
        { status: 500 }
      )
    }

    if (!sessionActivity) {
      return NextResponse.json(
        { error: "Activite de seance introuvable." },
        { status: 404 }
      )
    }

    const assigneeIds = uniqueAssignments.map((item) => item.userId)

    const { data: activeMembers, error: activeMembersError } = await supabase
      .from("members")
      .select("user_id")
      .in("user_id", assigneeIds)
      .eq("status", "active")

    if (activeMembersError) {
      return NextResponse.json(
        { error: mapSessionsError(activeMembersError.message) },
        { status: 500 }
      )
    }

    const activeIdSet = new Set((activeMembers ?? []).map((item) => item.user_id))
    const inactiveIds = assigneeIds.filter((id) => !activeIdSet.has(id))

    if (inactiveIds.length > 0) {
      return NextResponse.json(
        {
          error:
            "Certains utilisateurs ne sont pas membres actifs et ne peuvent pas etre assignes.",
          details: { inactiveIds },
        },
        { status: 400 }
      )
    }

    const { error: deleteOldError } = await supabase
      .from("session_activity_assignments")
      .delete()
      .eq("session_activity_id", actId)

    if (deleteOldError) {
      return NextResponse.json(
        { error: mapSessionsError(deleteOldError.message) },
        { status: 500 }
      )
    }

    const rowsToInsert = uniqueAssignments.map((item) => ({
      session_activity_id: actId,
      user_id: item.userId,
      assignment_type: item.assignmentType,
      reason: item.reason,
      assigned_by: user.id,
    }))

    const { data, error } = await supabase
      .from("session_activity_assignments")
      .insert(rowsToInsert)
      .select(ASSIGNMENT_SELECT)

    if (error) {
      return NextResponse.json(
        { error: mapSessionsError(error.message) },
        { status: 500 }
      )
    }

    const hydrated = await hydrateAssignmentsUsers(
      supabase,
      (data ?? []) as Array<{ user_id: string }>
    )
    if (!hydrated.ok) {
      return NextResponse.json(
        { error: mapSessionsError(hydrated.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydrated.data })
  } catch (error) {
    console.error("Erreur sessions/[id]/activities/[actId]/assign POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
