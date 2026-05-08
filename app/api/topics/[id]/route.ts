import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { topicUpdateSchema } from "@/lib/validations/phase9"
import { isActiveAdmin, isActiveMember, mapTopicsError, TOPIC_SELECT } from "../_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function getTopicById(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  id: string
) {
  return supabase.from("topics").select(TOPIC_SELECT).eq("id", id).maybeSingle()
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
    if (!id) {
      return NextResponse.json(
        { error: "Identifiant sujet manquant." },
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

    const { data, error } = await getTopicById(supabase, id)
    if (error) {
      return NextResponse.json(
        { error: mapTopicsError(error.message) },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur topics/[id] GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
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
    if (!id) {
      return NextResponse.json(
        { error: "Identifiant sujet manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = topicUpdateSchema.safeParse(body)

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

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: existing, error: existingError } = await getTopicById(supabase, id)
    if (existingError) {
      return NextResponse.json(
        { error: mapTopicsError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 })
    }

    const payload = validation.data

    const updateData: {
      title?: string
      description?: string
      level?: "beginner" | "intermediate" | "advanced"
      activity_id?: string | null
    } = {}

    if (payload.title !== undefined) {
      updateData.title = payload.title
    }

    if (payload.description !== undefined) {
      updateData.description = payload.description
    }

    if (payload.level !== undefined) {
      updateData.level = payload.level
    }

    if (payload.activityId !== undefined) {
      const cleanedActivityId = payload.activityId?.trim() || null
      updateData.activity_id = cleanedActivityId
    }

    const { data, error } = await supabase
      .from("topics")
      .update(updateData)
      .eq("id", id)
      .select(TOPIC_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapTopicsError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur topics/[id] PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
