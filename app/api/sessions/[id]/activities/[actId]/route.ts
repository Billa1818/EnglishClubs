import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { sessionActivityUpdateSchema } from "@/lib/validations/phase5"
import { isActiveAdmin, mapSessionsError } from "../../../_shared"
import { hydrateSessionActivitiesAssignmentsUsers } from "../../../_assignment-profiles"

type RouteContext = {
  params: Promise<{
    id: string
    actId: string
  }>
}

const SESSION_ACTIVITY_SELECT =
  "id, session_id, activity_id, order_index, duration, assignment_timing, status, started_at, completed_at, created_at, updated_at, activity:activities(id, name, name_en, description, category, default_duration, min_duration, max_duration, members_required, selection_mode, requires_topic, topics_reusable, instructions, materials, icon, is_default, is_archived), assignments:session_activity_assignments(id, session_activity_id, user_id, assignment_type, reason, assigned_at, assigned_by)"

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const validation = sessionActivityUpdateSchema.safeParse(body)

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
        { error: mapSessionsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const [{ data: session, error: sessionError }, { data: existing, error: existingError }] =
      await Promise.all([
        supabase
          .from("sessions")
          .select("id, status")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("session_activities")
          .select("id, session_id, order_index")
          .eq("id", actId)
          .eq("session_id", sessionId)
          .maybeSingle(),
      ])

    if (sessionError) {
      return NextResponse.json(
        { error: mapSessionsError(sessionError.message) },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (session.status !== "upcoming") {
      return NextResponse.json(
        {
          error:
            "Modification impossible: seules les seances qui n'ont pas encore commence peuvent etre modifiees.",
        },
        { status: 400 }
      )
    }

    if (existingError) {
      return NextResponse.json(
        { error: mapSessionsError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Activite de seance introuvable." },
        { status: 404 }
      )
    }

    if (payload.orderIndex && payload.orderIndex !== existing.order_index) {
      const { data: conflict, error: conflictError } = await supabase
        .from("session_activities")
        .select("id")
        .eq("session_id", sessionId)
        .eq("order_index", payload.orderIndex)
        .neq("id", actId)
        .maybeSingle()

      if (conflictError) {
        return NextResponse.json(
          { error: mapSessionsError(conflictError.message) },
          { status: 500 }
        )
      }

      if (conflict) {
        return NextResponse.json(
          {
            error:
              "orderIndex deja utilise pour cette seance. Choisissez une autre position.",
          },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from("session_activities")
      .update({
        order_index: payload.orderIndex,
        duration: payload.duration,
        assignment_timing: payload.assignmentTiming,
        status: payload.status,
      })
      .eq("id", actId)
      .eq("session_id", sessionId)
      .select(SESSION_ACTIVITY_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapSessionsError(error.message) },
        { status: 500 }
      )
    }

    const hydrated = await hydrateSessionActivitiesAssignmentsUsers(
      supabase,
      [data] as Array<{ assignments: Array<{ user_id: string }> | null }>
    )
    if (!hydrated.ok) {
      return NextResponse.json(
        { error: mapSessionsError(hydrated.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydrated.data[0] })
  } catch (error) {
    console.error("Erreur sessions/[id]/activities/[actId] PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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

    if (session.status !== "upcoming") {
      return NextResponse.json(
        {
          error:
            "Modification impossible: seules les seances qui n'ont pas encore commence peuvent etre modifiees.",
        },
        { status: 400 }
      )
    }

    const { data: deleted, error: deleteError } = await supabase
      .from("session_activities")
      .delete()
      .eq("id", actId)
      .eq("session_id", sessionId)
      .select("id")
      .maybeSingle()

    if (deleteError) {
      return NextResponse.json(
        { error: mapSessionsError(deleteError.message) },
        { status: 500 }
      )
    }

    if (!deleted) {
      return NextResponse.json(
        { error: "Activite de seance introuvable." },
        { status: 404 }
      )
    }

    const { data: remaining, error: remainingError } = await supabase
      .from("session_activities")
      .select("id, order_index")
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true })

    if (remainingError) {
      return NextResponse.json(
        { error: mapSessionsError(remainingError.message) },
        { status: 500 }
      )
    }

    for (const [index, item] of (remaining ?? []).entries()) {
      const expectedOrder = index + 1
      if (item.order_index === expectedOrder) {
        continue
      }

      const { error: reorderError } = await supabase
        .from("session_activities")
        .update({ order_index: expectedOrder })
        .eq("id", item.id)

      if (reorderError) {
        return NextResponse.json(
          { error: mapSessionsError(reorderError.message) },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, data: { id: deleted.id } })
  } catch (error) {
    console.error("Erreur sessions/[id]/activities/[actId] DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
