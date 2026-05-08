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
      .select("id, status")
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

    if (session.status === "ongoing") {
      return NextResponse.json({
        success: true,
        data: {
          id,
          status: "ongoing",
          alreadyStarted: true,
        },
      })
    }

    if (session.status !== "upcoming") {
      return NextResponse.json(
        { error: "Seule une seance a venir peut etre demarree." },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()

    const { error: startSessionError } = await supabase
      .from("sessions")
      .update({
        status: "ongoing",
        started_at: nowIso,
        completed_at: null,
      })
      .eq("id", id)

    if (startSessionError) {
      return NextResponse.json(
        { error: mapSessionsError(startSessionError.message) },
        { status: 500 }
      )
    }

    const { data: sessionActivities, error: activitiesError } = await supabase
      .from("session_activities")
      .select("id")
      .eq("session_id", id)
      .order("order_index", { ascending: true })

    if (activitiesError) {
      return NextResponse.json(
        { error: mapSessionsError(activitiesError.message) },
        { status: 500 }
      )
    }

    let currentActivityId: string | null = null

    if ((sessionActivities ?? []).length > 0) {
      const first = sessionActivities?.[0]
      if (first) {
        currentActivityId = first.id
      }

      const { error: resetActivitiesError } = await supabase
        .from("session_activities")
        .update({
          status: "pending",
          started_at: null,
          completed_at: null,
        })
        .eq("session_id", id)
        .in("status", ["pending", "in_progress", "skipped"])

      if (resetActivitiesError) {
        return NextResponse.json(
          { error: mapSessionsError(resetActivitiesError.message) },
          { status: 500 }
        )
      }

      if (currentActivityId) {
        const { error: firstActivityError } = await supabase
          .from("session_activities")
          .update({
            status: "in_progress",
            started_at: nowIso,
            completed_at: null,
          })
          .eq("id", currentActivityId)

        if (firstActivityError) {
          return NextResponse.json(
            { error: mapSessionsError(firstActivityError.message) },
            { status: 500 }
          )
        }
      }

      const { error: indexError } = await supabase
        .from("sessions")
        .update({ current_activity_index: 0 })
        .eq("id", id)

      if (indexError) {
        return NextResponse.json(
          { error: mapSessionsError(indexError.message) },
          { status: 500 }
        )
      }
    } else {
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
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        status: "ongoing",
        startedAt: nowIso,
        currentActivityId,
      },
    })
  } catch (error) {
    console.error("Erreur sessions/[id]/start POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
