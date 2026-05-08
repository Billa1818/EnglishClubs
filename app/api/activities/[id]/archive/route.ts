import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { activityArchiveSchema } from "@/lib/validations/phase4"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function mapActivitiesError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("activities")) {
    return "La table `activities` est absente. Execute `011_create_activities.sql`."
  }

  return message
}

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
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
    if (!id) {
      return NextResponse.json(
        { error: "Identifiant activite manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = activityArchiveSchema.safeParse(body)
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
        { error: mapActivitiesError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("activities")
      .update({ is_archived: validation.data.isArchived })
      .eq("id", id)
      .select("id, is_archived, updated_at")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: mapActivitiesError(error.message) },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Activite introuvable." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur activities/[id]/archive POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
