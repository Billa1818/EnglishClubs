import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin"
import { getCurrentMember } from "@/lib/auth/server"
import { absenceReviewSchema } from "@/lib/validations/phase7"
import { isActiveAdmin } from "@/app/api/sessions/_shared"
import {
  ABSENCE_SELECT,
  type AbsenceBaseRow,
  hydrateAbsenceRelations,
  mapAbsenceError,
} from "../_shared"

type RouteContext = {
  params: Promise<{
    id: string
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

    const { id } = await context.params
    const requestId = id?.trim()

    if (!requestId) {
      return NextResponse.json({ error: "Identifiant demande manquant." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const validation = absenceReviewSchema.safeParse(body)
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
    const adminComment = payload.adminComment?.trim() || null

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
        { error: mapAbsenceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const writer = isSupabaseAdminConfigured() ? createAdminClient() : supabase

    const { data: existing, error: existingError } = await writer
      .from("absence_requests")
      .select("id")
      .eq("id", requestId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: mapAbsenceError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ error: "Demande d'absence introuvable." }, { status: 404 })
    }

    const now = new Date().toISOString()
    const { data: updatedData, error: updateError } = await writer
      .from("absence_requests")
      .update({
        status: payload.status,
        admin_comment: adminComment,
        reviewed_at: now,
        reviewed_by: user.id,
      })
      .eq("id", requestId)
      .select(ABSENCE_SELECT)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: mapAbsenceError(updateError.message) },
        { status: 500 }
      )
    }

    const hydration = await hydrateAbsenceRelations(
      supabase,
      updatedData ? [updatedData as AbsenceBaseRow] : []
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAbsenceError(hydration.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydration.data[0] })
  } catch (error) {
    console.error("Erreur absences/[id] PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
