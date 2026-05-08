import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { activityUpdateSchema } from "@/lib/validations/phase4"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type ActivityRow = {
  id: string
  name: string
  name_en: string
  description: string
  category: "ice_breaker" | "vocabulary" | "conversation" | "comprehension" | "writing"
  default_duration: number
  min_duration: number
  max_duration: number
  members_required: number
  selection_mode: "automatic" | "manual" | "semi-automatic"
  requires_topic: boolean
  topics_reusable: boolean
  instructions: string
  materials: string[]
  icon: string | null
  is_default: boolean
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

const ACTIVITY_SELECT =
  "id, name, name_en, description, category, default_duration, min_duration, max_duration, members_required, selection_mode, requires_topic, topics_reusable, instructions, materials, icon, is_default, is_archived, created_by, created_at, updated_at"

function mapActivitiesError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("activities")) {
    return "La table `activities` est absente. Execute `011_create_activities.sql`."
  }

  if (lower.includes("schema cache")) {
    return "Le schema Supabase n'est pas a jour pour `activities`. Execute les scripts SQL de la phase 4."
  }

  if (lower.includes("column") && lower.includes("activities")) {
    return "Le schema `activities` est incompatible. Reexecute les scripts SQL de la phase 4."
  }

  return message
}

function isActiveMember(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active"
}

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

async function getActivityById(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  id: string
) {
  return supabase.from("activities").select(ACTIVITY_SELECT).eq("id", id).maybeSingle()
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
        { error: "Identifiant activite manquant." },
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

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await getActivityById(supabase, id)
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
    console.error("Erreur activities/[id] GET:", error)
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
        { error: "Identifiant activite manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = activityUpdateSchema.safeParse(body)
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

    const { data: existing, error: existingError } = await getActivityById(supabase, id)
    if (existingError) {
      return NextResponse.json(
        { error: mapActivitiesError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ error: "Activite introuvable." }, { status: 404 })
    }

    const payload = validation.data
    const mergedMin = payload.minDuration ?? existing.min_duration
    const mergedDefault = payload.defaultDuration ?? existing.default_duration
    const mergedMax = payload.maxDuration ?? existing.max_duration

    if (mergedMin > mergedDefault || mergedDefault > mergedMax) {
      return NextResponse.json(
        {
          error:
            "Durees invalides. La regle attendue est: min <= duree par defaut <= max.",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("activities")
      .update({
        name: payload.name,
        name_en: payload.nameEn,
        description: payload.description,
        category: payload.category,
        default_duration: payload.defaultDuration,
        min_duration: payload.minDuration,
        max_duration: payload.maxDuration,
        members_required: payload.membersRequired,
        selection_mode: payload.selectionMode,
        requires_topic: payload.requiresTopic,
        topics_reusable: payload.topicsReusable,
        instructions: payload.instructions,
        materials: payload.materials,
        icon: payload.icon,
        is_default: payload.isDefault,
      })
      .eq("id", id)
      .select(ACTIVITY_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapActivitiesError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur activities/[id] PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
