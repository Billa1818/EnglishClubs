import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { selectionCycleResetSchema } from "@/lib/validations/phase8"
import {
  closeCycle,
  createActiveCycle,
  getActiveCycle,
  isActiveAdmin,
  mapSelectionError,
} from "@/app/api/selection/_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json().catch(() => ({}))
    const validation = selectionCycleResetSchema.safeParse(body)
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
        { error: mapSelectionError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
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

    const currentCycleResult = await getActiveCycle(supabase, activityId)
    if (!currentCycleResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(currentCycleResult.error) },
        { status: 500 }
      )
    }

    if (currentCycleResult.data) {
      const closeResult = await closeCycle(supabase, currentCycleResult.data.id)
      if (!closeResult.ok) {
        return NextResponse.json(
          { error: mapSelectionError(closeResult.error) },
          { status: 500 }
        )
      }
    }

    const newCycleResult = await createActiveCycle(supabase, {
      activityId,
      createdBy: user.id,
    })
    if (!newCycleResult.ok) {
      return NextResponse.json(
        { error: mapSelectionError(newCycleResult.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        activity,
        previousCycleId: currentCycleResult.data?.id ?? null,
        cycle: newCycleResult.data,
      },
      message: "Cycle reinitialise avec succes.",
    })
  } catch (error) {
    console.error("Erreur activities/[id]/cycle/reset POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

