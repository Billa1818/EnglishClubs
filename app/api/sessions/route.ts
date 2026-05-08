import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { sessionCreateSchema, sessionsListQuerySchema } from "@/lib/validations/phase5"
import { isActiveAdmin, isActiveMember, mapSessionsError } from "./_shared"
import {
  ensureScheduledSessions,
  insertSingleSessionWithLegacySupport,
  mapSessionsLegacyGroupError,
} from "@/lib/sessions/schedule"

type SessionActivityPreviewRow = {
  id: string
  session_id: string
  activity_id: string
  order_index: number
  duration: number
  assignment_timing: "before_event" | "during_event"
  status: "pending" | "in_progress" | "completed" | "skipped"
  activity: {
    id: string
    name: string
    category:
      | "ice_breaker"
      | "vocabulary"
      | "conversation"
      | "comprehension"
      | "writing"
  } | null
}

type SessionListRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  notes: string | null
  topic_id: string | null
  topic: {
    id: string
    title: string
    level: "beginner" | "intermediate" | "advanced"
  } | null
  started_at: string | null
  completed_at: string | null
  current_activity_index: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  session_activities: SessionActivityPreviewRow[] | null
}

type SessionsListResponse = {
  success?: boolean
  error?: string
  data?: SessionListRow[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const SESSION_LIST_SELECT =
  "id, date, start_time, end_time, status, notes, topic_id, topic:topics(id, title, level), started_at, completed_at, current_activity_index, created_by, created_at, updated_at, session_activities(id, session_id, activity_id, order_index, duration, assignment_timing, status, activity:activities(id, name, category))"

const SESSION_LIST_SELECT_LITE =
  "id, date, start_time, end_time, status, notes, topic_id, started_at, completed_at, current_activity_index, created_by, created_at, updated_at"

function shouldFallbackToLiteSessionsSelect(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find a relationship between") ||
    (lower.includes("relation") && lower.includes("topics") && lower.includes("does not exist")) ||
    (lower.includes("relation") &&
      lower.includes("session_activities") &&
      lower.includes("does not exist"))
  )
}

function applySearchFilter(rows: SessionListRow[], search: string | undefined) {
  if (!search) {
    return rows
  }

  const needle = search.toLowerCase()
  return rows.filter((row) => {
    const activities = row.session_activities ?? []
    const activityText = activities
      .map((item) => item.activity?.name || "")
      .join(" ")
      .toLowerCase()

    const haystack = [
      row.id,
      row.status,
      row.notes ?? "",
      row.date,
      row.start_time,
      row.end_time,
      row.topic?.title ?? "",
      activityText,
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

    const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validation = sessionsListQuerySchema.safeParse(queryObject)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { status, search, fromDate, toDate, page, limit } = validation.data
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
        { error: mapSessionsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    if (isActiveAdmin(memberResult.member)) {
      const planningResult = await ensureScheduledSessions({
        supabase,
        createdBy: user.id,
      })

      if (!planningResult.ok) {
        console.error(
          "Erreur auto-planification des seances (GET /api/sessions):",
          mapSessionsLegacyGroupError(planningResult.error)
        )
      }
    }

    let query = supabase
      .from("sessions")
      .select(SESSION_LIST_SELECT)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(1000)

    if (status) {
      query = query.eq("status", status)
    }

    if (fromDate) {
      query = query.gte("date", fromDate)
    }

    if (toDate) {
      query = query.lte("date", toDate)
    }

    const { data, error } = await query

    let rows: SessionListRow[] = []

    if (error) {
      if (!shouldFallbackToLiteSessionsSelect(error.message)) {
        return NextResponse.json(
          { error: mapSessionsError(error.message) },
          { status: 500 }
        )
      }

      console.warn(
        "Fallback sessions lite select (relations indisponibles):",
        error.message
      )

      let liteQuery = supabase
        .from("sessions")
        .select(SESSION_LIST_SELECT_LITE)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(1000)

      if (status) {
        liteQuery = liteQuery.eq("status", status)
      }

      if (fromDate) {
        liteQuery = liteQuery.gte("date", fromDate)
      }

      if (toDate) {
        liteQuery = liteQuery.lte("date", toDate)
      }

      const { data: liteData, error: liteError } = await liteQuery
      if (liteError) {
        return NextResponse.json(
          { error: mapSessionsError(liteError.message) },
          { status: 500 }
        )
      }

      rows = (liteData ?? []).map((row) => ({
        ...(row as Omit<SessionListRow, "topic" | "session_activities">),
        topic: null,
        session_activities: [],
      })) as SessionListRow[]
    } else {
      rows = (data ?? []) as SessionListRow[]
    }

    const filteredRows = applySearchFilter(rows, search)
    const total = filteredRows.length
    const start = (page - 1) * limit
    const paginatedRows = filteredRows.slice(start, start + limit)

    const response: SessionsListResponse = {
      success: true,
      data: paginatedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erreur sessions GET:", error)
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
    const validation = sessionCreateSchema.safeParse(body)

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
        { error: mapSessionsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const payload = validation.data
    const cleanedTopicId = payload.topicId?.trim() || null

    if (cleanedTopicId) {
      const { data: topic, error: topicError } = await supabase
        .from("topics")
        .select("id, is_archived")
        .eq("id", cleanedTopicId)
        .maybeSingle()

      if (topicError) {
        return NextResponse.json(
          { error: mapSessionsError(topicError.message) },
          { status: 500 }
        )
      }

      if (!topic) {
        return NextResponse.json(
          { error: "Sujet introuvable." },
          { status: 404 }
        )
      }

      if (topic.is_archived) {
        return NextResponse.json(
          { error: "Le sujet selectionne est archive." },
          { status: 400 }
        )
      }
    }

    const insertResult = await insertSingleSessionWithLegacySupport<SessionListRow>({
      supabase,
      row: {
        date: payload.date,
        start_time: payload.startTime,
        end_time: payload.endTime,
        notes: payload.notes || null,
        topic_id: cleanedTopicId,
        status: "upcoming",
        created_by: user.id,
      },
      select: SESSION_LIST_SELECT,
    })

    if (!insertResult.ok) {
      return NextResponse.json(
        { error: mapSessionsError(insertResult.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: insertResult.data }, { status: 201 })
  } catch (error) {
    console.error("Erreur sessions POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
