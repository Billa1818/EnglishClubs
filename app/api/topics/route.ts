import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { topicCreateSchema, topicListQuerySchema } from "@/lib/validations/phase9"
import { isActiveAdmin, isActiveMember, mapTopicsError, TOPIC_SELECT } from "./_shared"

type TopicRow = {
  id: string
  activity_id: string | null
  title: string
  description: string
  level: "beginner" | "intermediate" | "advanced"
  is_archived: boolean
  usage_count: number
  created_by: string | null
  created_at: string
  updated_at: string
  activity?: {
    id: string
    name: string
    name_en: string
    requires_topic: boolean
    is_archived: boolean
  } | null
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

function applySearchFilter(rows: TopicRow[], search: string | undefined) {
  if (!search) {
    return rows
  }

  const needle = search.toLowerCase()
  return rows.filter((row) => {
    const haystack = [row.id, row.title, row.description]
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

    const validation = topicListQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { search, level, activityId, includeArchived, page, limit } = validation.data
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

    let query = supabase
      .from("topics")
      .select(TOPIC_SELECT)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (level) {
      query = query.eq("level", level)
    }

    if (activityId === "none") {
      query = query.is("activity_id", null)
    } else if (activityId) {
      query = query.eq("activity_id", activityId)
    }

    if (!includeArchived) {
      query = query.eq("is_archived", false)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: mapTopicsError(error.message) },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as TopicRow[]
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
    console.error("Erreur topics GET:", error)
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
    const validation = topicCreateSchema.safeParse(body)
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

    const payload = validation.data
    const cleanedActivityId = payload.activityId?.trim() || null

    const { data, error } = await supabase
      .from("topics")
      .insert({
        activity_id: cleanedActivityId,
        title: payload.title,
        description: payload.description,
        level: payload.level,
        created_by: user.id,
      })
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
    console.error("Erreur topics POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
