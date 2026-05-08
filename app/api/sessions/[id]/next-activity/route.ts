import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { isActiveAdmin, mapSessionsError } from "../../_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type SessionActivityRow = {
  id: string
  order_index: number
  status: "pending" | "in_progress" | "completed" | "skipped"
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id } = await context.params
    if (!id) {
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

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, current_activity_index")
      .eq("id", id)
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

    if (session.status !== "ongoing") {
      return NextResponse.json(
        { error: "La seance doit etre en cours pour passer a l'activite suivante." },
        { status: 400 }
      )
    }

    const { data: activitiesRaw, error: activitiesError } = await supabase
      .from("session_activities")
      .select("id, order_index, status")
      .eq("session_id", id)
      .order("order_index", { ascending: true })

    if (activitiesError) {
      return NextResponse.json(
        { error: mapSessionsError(activitiesError.message) },
        { status: 500 }
      )
    }

    const activities = (activitiesRaw ?? []) as SessionActivityRow[]
    if (activities.length === 0) {
      return NextResponse.json(
        { error: "Aucune activite n'est planifiee pour cette seance." },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()

    const inProgressIndexes = activities
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === "in_progress")
      .map(({ index }) => index)

    let baseIndex =
      inProgressIndexes.length > 0
        ? inProgressIndexes[0]
        : typeof session.current_activity_index === "number"
          ? session.current_activity_index
          : -1

    if (baseIndex >= activities.length) {
      baseIndex = activities.length - 1
    }

    const { error: completeCurrentError } = await supabase
      .from("session_activities")
      .update({
        status: "completed",
        completed_at: nowIso,
      })
      .eq("session_id", id)
      .eq("status", "in_progress")

    if (completeCurrentError) {
      return NextResponse.json(
        { error: mapSessionsError(completeCurrentError.message) },
        { status: 500 }
      )
    }

    const startIndex = Math.max(0, baseIndex + 1)
    let nextIndex = -1
    for (let index = startIndex; index < activities.length; index += 1) {
      if (activities[index]?.status === "pending") {
        nextIndex = index
        break
      }
    }

    if (nextIndex < 0) {
      const { error: clearIndexError } = await supabase
        .from("sessions")
        .update({ current_activity_index: null })
        .eq("id", id)

      if (clearIndexError) {
        return NextResponse.json(
          { error: mapSessionsError(clearIndexError.message) },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          sessionId: id,
          hasNext: false,
          nextActivityId: null,
          completedCurrent: true,
        },
      })
    }

    const nextActivity = activities[nextIndex]
    if (!nextActivity) {
      return NextResponse.json(
        { error: "Impossible de trouver l'activite suivante." },
        { status: 500 }
      )
    }

    const { error: startNextError } = await supabase
      .from("session_activities")
      .update({
        status: "in_progress",
        started_at: nowIso,
        completed_at: null,
      })
      .eq("id", nextActivity.id)
      .eq("session_id", id)

    if (startNextError) {
      return NextResponse.json(
        { error: mapSessionsError(startNextError.message) },
        { status: 500 }
      )
    }

    const { error: updateIndexError } = await supabase
      .from("sessions")
      .update({ current_activity_index: nextIndex })
      .eq("id", id)

    if (updateIndexError) {
      return NextResponse.json(
        { error: mapSessionsError(updateIndexError.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        hasNext: true,
        nextActivityId: nextActivity.id,
        nextActivityIndex: nextIndex,
      },
    })
  } catch (error) {
    console.error("Erreur sessions/[id]/next-activity POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

