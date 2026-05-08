import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { activityCreateSchema, activityListQuerySchema } from "@/lib/validations/phase4"

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
    return "Le schema Supabase n'est pas a jour pour `activities`. Execute `011_create_activities.sql` puis `012_rls_activities.sql`."
  }

  if (lower.includes("column") && lower.includes("activities")) {
    return "Le schema `activities` est incomplet. Execute les scripts SQL de la phase 4."
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

function parseBooleanQuery(value: string | null) {
  if (value === null) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes", "oui"].includes(normalized)) {
    return true
  }
  if (["0", "false", "no", "non"].includes(normalized)) {
    return false
  }

  return value
}

function applySearchFilter(rows: ActivityRow[], search: string | undefined) {
  if (!search) {
    return rows
  }

  const needle = search.toLowerCase()
  return rows.filter((row) => {
    const haystack = [
      row.id,
      row.name,
      row.name_en,
      row.description,
      row.instructions,
      row.category,
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(needle)
  })
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const queryObject: Record<string, unknown> = {
      ...Object.fromEntries(request.nextUrl.searchParams.entries()),
    }
    if (request.nextUrl.searchParams.has("includeArchived")) {
      queryObject.includeArchived = parseBooleanQuery(
        request.nextUrl.searchParams.get("includeArchived")
      )
    }

    const validation = activityListQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { category, search, includeArchived, page, limit } = validation.data
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

    let query = supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (category) {
      query = query.eq("category", category)
    }

    if (!includeArchived) {
      query = query.eq("is_archived", false)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: mapActivitiesError(error.message) },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as ActivityRow[]
    const filteredRows = applySearchFilter(rows, search)
    const total = filteredRows.length
    const start = (page - 1) * limit
    const paginatedRows = filteredRows.slice(start, start + limit)

    return NextResponse.json({
      success: true,
      data: paginatedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error("Erreur activities GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = activityCreateSchema.safeParse(body)
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

    const payload = validation.data

    const { data, error } = await supabase
      .from("activities")
      .insert({
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
        icon: payload.icon ?? null,
        is_default: payload.isDefault ?? false,
        is_archived: false,
        created_by: user.id,
      })
      .select(ACTIVITY_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapActivitiesError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error("Erreur activities POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
