import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import {
  FCC_SELECT,
  type FccRow,
  isActiveAdmin,
  isActiveMember,
  mapFccError,
  withSignedScreenshots,
} from "../_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id } = await context.params
    const requestedUserId = id?.trim()

    if (!requestedUserId) {
      return NextResponse.json({ error: "Identifiant utilisateur manquant." }, { status: 400 })
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

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const targetUserId = requestedUserId === "me" ? user.id : requestedUserId

    const { data, error } = await supabase
      .from("fcc_progressions")
      .select(FCC_SELECT)
      .eq("user_id", targetUserId)
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: mapFccError(error.message) }, { status: 500 })
    }

    const rows = (data ?? []) as FccRow[]
    const rowsWithScreenshots = await withSignedScreenshots(supabase, rows, {
      viewerId: user.id,
      isAdmin: isActiveAdmin(memberResult.member),
    })

    return NextResponse.json({
      success: true,
      data: rowsWithScreenshots,
    })
  } catch (error) {
    console.error("Erreur fcc/[id] GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
