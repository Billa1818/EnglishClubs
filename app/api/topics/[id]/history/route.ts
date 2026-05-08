import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { topicHistoryQuerySchema } from "@/lib/validations/phase9"
import { isActiveMember, mapTopicsError } from "../../_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id: topicId } = await context.params
    if (!topicId) {
      return NextResponse.json(
        { error: "Identifiant sujet manquant." },
        { status: 400 }
      )
    }

    const queryObject: Record<string, unknown> = {
      ...Object.fromEntries(request.nextUrl.searchParams.entries()),
    }

    const validation = topicHistoryQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { page, limit } = validation.data
    const from = (page - 1) * limit
    const to = from + limit - 1

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
        { error: mapTopicsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id")
      .eq("id", topicId)
      .maybeSingle()

    if (topicError) {
      return NextResponse.json(
        { error: mapTopicsError(topicError.message) },
        { status: 500 }
      )
    }

    if (!topic) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 })
    }

    const { data, error, count } = await supabase
      .from("topic_usages")
      .select(
        "id, topic_id, session_id, user_id, used_at, created_at, session:sessions(id, date, start_time, end_time, status), user:profiles(id, first_name, last_name, pseudo, photo_url)",
        { count: "exact" }
      )
      .eq("topic_id", topicId)
      .order("used_at", { ascending: false })
      .range(from, to)

    if (error) {
      return NextResponse.json(
        { error: mapTopicsError(error.message) },
        { status: 500 }
      )
    }

    const total = count ?? 0

    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error("Erreur topics/[id]/history GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
