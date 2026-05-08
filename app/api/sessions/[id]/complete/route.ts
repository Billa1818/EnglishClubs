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

    if (session.status === "completed") {
      return NextResponse.json({
        success: true,
        data: {
          id,
          status: "completed",
          alreadyCompleted: true,
        },
      })
    }

    if (session.status === "cancelled") {
      return NextResponse.json(
        { error: "Une seance annulee ne peut pas etre terminee." },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()

    const { error: completeInProgressError } = await supabase
      .from("session_activities")
      .update({
        status: "completed",
        completed_at: nowIso,
      })
      .eq("session_id", id)
      .eq("status", "in_progress")

    if (completeInProgressError) {
      return NextResponse.json(
        { error: mapSessionsError(completeInProgressError.message) },
        { status: 500 }
      )
    }

    const { error: skipPendingError } = await supabase
      .from("session_activities")
      .update({
        status: "skipped",
      })
      .eq("session_id", id)
      .eq("status", "pending")

    if (skipPendingError) {
      return NextResponse.json(
        { error: mapSessionsError(skipPendingError.message) },
        { status: 500 }
      )
    }

    const { error: completeSessionError } = await supabase
      .from("sessions")
      .update({
        status: "completed",
        completed_at: nowIso,
        current_activity_index: null,
      })
      .eq("id", id)

    if (completeSessionError) {
      return NextResponse.json(
        { error: mapSessionsError(completeSessionError.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        status: "completed",
        completedAt: nowIso,
      },
    })
  } catch (error) {
    console.error("Erreur sessions/[id]/complete POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
