import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { topicUseSchema } from "@/lib/validations/phase9"
import { isActiveMember, mapTopicsError } from "../../_shared"

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

    const { id: topicId } = await context.params
    if (!topicId) {
      return NextResponse.json(
        { error: "Identifiant sujet manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = topicUseSchema.safeParse(body)
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
        { error: mapTopicsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const sessionId = validation.data.sessionId

    const [topicResult, sessionResult] = await Promise.all([
      supabase
        .from("topics")
        .select("id, is_archived, usage_count")
        .eq("id", topicId)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .maybeSingle(),
    ])

    if (topicResult.error) {
      return NextResponse.json(
        { error: mapTopicsError(topicResult.error.message) },
        { status: 500 }
      )
    }

    if (!topicResult.data) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 })
    }

    if (topicResult.data.is_archived) {
      return NextResponse.json(
        { error: "Ce sujet est archive et ne peut pas etre utilise." },
        { status: 400 }
      )
    }

    if (sessionResult.error) {
      return NextResponse.json(
        { error: mapTopicsError(sessionResult.error.message) },
        { status: 500 }
      )
    }

    if (!sessionResult.data) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("topic_usages")
      .insert({
        topic_id: topicId,
        session_id: sessionId,
        user_id: user.id,
      })
      .select("id, topic_id, session_id, user_id, used_at")
      .single()

    if (error) {
      const mapped = mapTopicsError(error.message)
      const status =
        mapped ===
        "Ce sujet est deja marque comme utilise par ce membre pour cette seance."
          ? 409
          : 500

      return NextResponse.json({ error: mapped }, { status })
    }

    const { data: updatedTopic, error: updatedTopicError } = await supabase
      .from("topics")
      .select("id, usage_count")
      .eq("id", topicId)
      .maybeSingle()

    if (updatedTopicError) {
      return NextResponse.json(
        { error: mapTopicsError(updatedTopicError.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        usage: data,
        topic: updatedTopic,
      },
    })
  } catch (error) {
    console.error("Erreur topics/[id]/use POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
