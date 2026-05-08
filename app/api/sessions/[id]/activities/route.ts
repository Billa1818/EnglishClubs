import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { sessionActivityCreateSchema } from "@/lib/validations/phase5"
import { isActiveAdmin, isActiveMember, mapSessionsError } from "../../_shared"
import { hydrateSessionActivitiesAssignmentsUsers } from "../../_assignment-profiles"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const SESSION_ACTIVITY_SELECT =
  "id, session_id, activity_id, order_index, duration, assignment_timing, status, started_at, completed_at, created_at, updated_at, activity:activities(id, name, name_en, description, category, default_duration, min_duration, max_duration, members_required, selection_mode, requires_topic, topics_reusable, instructions, materials, icon, is_default, is_archived), assignments:session_activity_assignments(id, session_activity_id, user_id, assignment_type, reason, assigned_at, assigned_by)"

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id: sessionId } = await context.params
    if (!sessionId) {
      return NextResponse.json(
        { error: "Identifiant seance manquant." },
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

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("session_activities")
      .select(SESSION_ACTIVITY_SELECT)
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: mapSessionsError(error.message) },
        { status: 500 }
      )
    }

    const hydrated = await hydrateSessionActivitiesAssignmentsUsers(
      supabase,
      (data ?? []) as Array<{ assignments: Array<{ user_id: string }> | null }>
    )
    if (!hydrated.ok) {
      return NextResponse.json(
        { error: mapSessionsError(hydrated.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydrated.data })
  } catch (error) {
    console.error("Erreur sessions/[id]/activities GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id: sessionId } = await context.params
    if (!sessionId) {
      return NextResponse.json(
        { error: "Identifiant seance manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = sessionActivityCreateSchema.safeParse(body)

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

    const [{ data: session, error: sessionError }, { data: activity, error: activityError }] =
      await Promise.all([
        supabase
          .from("sessions")
          .select("id, status")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("activities")
          .select("id, default_duration, is_archived")
          .eq("id", payload.activityId)
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

    if (activityError) {
      return NextResponse.json(
        { error: mapSessionsError(activityError.message) },
        { status: 500 }
      )
    }

    if (!activity) {
      return NextResponse.json({ error: "Activite introuvable." }, { status: 404 })
    }

    if (activity.is_archived) {
      return NextResponse.json(
        { error: "Cette activite est archivee et ne peut pas etre ajoutee." },
        { status: 400 }
      )
    }

    const { data: existingItems, error: existingItemsError } = await supabase
      .from("session_activities")
      .select("id, order_index")
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true })

    if (existingItemsError) {
      return NextResponse.json(
        { error: mapSessionsError(existingItemsError.message) },
        { status: 500 }
      )
    }

    const rows = existingItems ?? []
    const maxOrder = rows.reduce(
      (maxValue, current) => Math.max(maxValue, current.order_index),
      0
    )

    const requestedOrder = payload.orderIndex ?? maxOrder + 1
    const orderAlreadyUsed = rows.some((item) => item.order_index === requestedOrder)

    if (orderAlreadyUsed) {
      return NextResponse.json(
        {
          error:
            "orderIndex deja utilise pour cette seance. Choisissez une autre position.",
        },
        { status: 409 }
      )
    }

    const duration = payload.duration ?? activity.default_duration

    const { data, error } = await supabase
      .from("session_activities")
      .insert({
        session_id: sessionId,
        activity_id: payload.activityId,
        order_index: requestedOrder,
        duration,
        assignment_timing: payload.assignmentTiming,
        status: "pending",
        created_by: user.id,
      })
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

    return NextResponse.json({ success: true, data: hydrated.data[0] }, { status: 201 })
  } catch (error) {
    console.error("Erreur sessions/[id]/activities POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
