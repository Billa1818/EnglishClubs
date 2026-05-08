import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { attendanceUpdateSchema } from "@/lib/validations/phase6"
import { isActiveAdmin, mapSessionsError } from "../../../_shared"
import {
  ATTENDANCE_SELECT,
  type AttendanceBaseRow,
  hydrateAttendancesProfiles,
  mapAttendanceError,
} from "@/app/api/attendances/_shared"

type RouteContext = {
  params: Promise<{
    id: string
    userId: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id, userId } = await context.params
    if (!id || !userId) {
      return NextResponse.json(
        { error: "Identifiants seance/utilisateur manquants." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = attendanceUpdateSchema.safeParse(body)
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
        { error: mapAttendanceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
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

    const { data: existing, error: existingError } = await supabase
      .from("attendances")
      .select("id, declared_at")
      .eq("session_id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: mapAttendanceError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Presence introuvable pour ce membre. Le membre doit d'abord declarer sa presence.",
        },
        { status: 404 }
      )
    }

    const nextStatus = validation.data.status
    const now = new Date().toISOString()

    const { data: updatedData, error } = await supabase
      .from("attendances")
      .update({
        status: nextStatus,
        declared_at:
          nextStatus === "declared" || nextStatus === "confirmed"
            ? existing.declared_at ?? now
            : existing.declared_at,
        confirmed_at: nextStatus === "confirmed" ? now : null,
        confirmed_by: nextStatus === "confirmed" ? user.id : null,
      })
      .eq("id", existing.id)
      .select(ATTENDANCE_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapAttendanceError(error.message) },
        { status: 500 }
      )
    }

    const hydration = await hydrateAttendancesProfiles(
      supabase,
      updatedData ? [updatedData as AttendanceBaseRow] : []
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAttendanceError(hydration.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydration.data[0] })
  } catch (error) {
    console.error("Erreur sessions/[id]/attendances/[userId] PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
