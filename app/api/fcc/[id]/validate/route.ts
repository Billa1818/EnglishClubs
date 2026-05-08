import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { fccValidateSchema } from "@/lib/validations/phase10"
import {
  FCC_SELECT,
  type FccRow,
  isActiveAdmin,
  mapFccError,
  withSignedScreenshots,
} from "../../_shared"

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

    const { id } = await context.params
    const progressionId = id?.trim()

    if (!progressionId) {
      return NextResponse.json({ error: "Identifiant progression manquant." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const validation = fccValidateSchema.safeParse(body)
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
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json({ error: mapFccError(memberResult.error) }, { status: 500 })
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces reserve aux administrateurs." }, { status: 403 })
    }

    const { data: existing, error: existingError } = await supabase
      .from("fcc_progressions")
      .select("id")
      .eq("id", progressionId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: mapFccError(existingError.message) }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: "Progression introuvable." }, { status: 404 })
    }

    const validated = validation.data.validated

    const { data: updated, error: updateError } = await supabase
      .from("fcc_progressions")
      .update({
        validated_by: validated ? user.id : null,
        validated_at: validated ? new Date().toISOString() : null,
      })
      .eq("id", progressionId)
      .select(FCC_SELECT)
      .single()

    if (updateError) {
      return NextResponse.json({ error: mapFccError(updateError.message) }, { status: 500 })
    }

    const [rowWithScreenshot] = await withSignedScreenshots(supabase, [updated as FccRow], {
      viewerId: user.id,
      isAdmin: true,
    })

    return NextResponse.json({
      success: true,
      data: rowWithScreenshot,
      message: validated ? "Progression validee." : "Validation retiree.",
    })
  } catch (error) {
    console.error("Erreur fcc/[id]/validate POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
