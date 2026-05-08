import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { sessionUpdateSchema } from "@/lib/validations/phase5"
import { isActiveAdmin, isActiveMember, mapSessionsError } from "../_shared"
import { hydrateSessionActivitiesAssignmentsUsers } from "../_assignment-profiles"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type SessionDetailRow = {
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
    description: string
    level: "beginner" | "intermediate" | "advanced"
  } | null
  started_at: string | null
  completed_at: string | null
  current_activity_index: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  session_activities: Array<{
    id: string
    session_id: string
    activity_id: string
    order_index: number
    duration: number
    assignment_timing: "before_event" | "during_event"
    status: "pending" | "in_progress" | "completed" | "skipped"
    started_at: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    activity: {
      id: string
      name: string
      name_en: string
      description: string
      category:
        | "ice_breaker"
        | "vocabulary"
        | "conversation"
        | "comprehension"
        | "writing"
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
    } | null
    assignments: Array<{
      id: string
      session_activity_id: string
      user_id: string
      assignment_type: string
      reason: string | null
      assigned_at: string
      assigned_by: string | null
      user: {
        id: string
        first_name: string
        last_name: string
        pseudo: string
        photo_url: string | null
        english_level: "beginner" | "intermediate" | "advanced"
      } | null
    }> | null
  }> | null
}

const SESSION_DETAIL_SELECT =
  "id, date, start_time, end_time, status, notes, topic_id, topic:topics(id, title, description, level), started_at, completed_at, current_activity_index, created_by, created_at, updated_at, session_activities(id, session_id, activity_id, order_index, duration, assignment_timing, status, started_at, completed_at, created_at, updated_at, activity:activities(id, name, name_en, description, category, default_duration, min_duration, max_duration, members_required, selection_mode, requires_topic, topics_reusable, instructions, materials, icon, is_default, is_archived), assignments:session_activity_assignments(id, session_activity_id, user_id, assignment_type, reason, assigned_at, assigned_by))"

async function getSessionById(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  id: string
) {
  const result = await supabase
    .from("sessions")
    .select(SESSION_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (result.error) {
    return { data: null, error: result.error.message }
  }

  if (!result.data) {
    return { data: null, error: null }
  }

  const hydrated = await hydrateSessionActivitiesAssignmentsUsers(
    supabase,
    result.data.session_activities
  )
  if (!hydrated.ok) {
    return { data: null, error: hydrated.error }
  }

  return {
    data: {
      ...result.data,
      session_activities: hydrated.data,
    },
    error: null,
  }
}

function normalizeTime(value: string) {
  return value.slice(0, 5)
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN
  }
  return hours * 60 + minutes
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
        { error: "Identifiant seance manquant." },
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

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await getSessionById(supabase, id)

    if (error) {
      return NextResponse.json(
        { error: mapSessionsError(error) },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur sessions/[id] GET:", error)
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
        { error: "Identifiant seance manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = sessionUpdateSchema.safeParse(body)
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

    const { data: existing, error: existingError } = await getSessionById(supabase, id)

    if (existingError) {
      return NextResponse.json(
        { error: mapSessionsError(existingError) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (existing.status !== "upcoming" || !!existing.started_at) {
      return NextResponse.json(
        {
          error:
            "Modification impossible: seules les seances qui n'ont pas encore commence peuvent etre modifiees.",
        },
        { status: 400 }
      )
    }

    const payload = validation.data
    const nextStart = payload.startTime
      ? payload.startTime
      : normalizeTime(existing.start_time)
    const nextEnd = payload.endTime ? payload.endTime : normalizeTime(existing.end_time)
    const nextTopicId =
      payload.topicId !== undefined
        ? payload.topicId?.trim() || null
        : existing.topic_id

    const nextStartMinutes = parseTimeToMinutes(nextStart)
    const nextEndMinutes = parseTimeToMinutes(nextEnd)

    if (
      Number.isNaN(nextStartMinutes) ||
      Number.isNaN(nextEndMinutes) ||
      nextEndMinutes <= nextStartMinutes
    ) {
      return NextResponse.json(
        { error: "Plage horaire invalide. L'heure de fin doit etre apres l'heure de debut." },
        { status: 400 }
      )
    }

    if (payload.topicId !== undefined && nextTopicId) {
      const { data: topic, error: topicError } = await supabase
        .from("topics")
        .select("id, is_archived")
        .eq("id", nextTopicId)
        .maybeSingle()

      if (topicError) {
        return NextResponse.json(
          { error: mapSessionsError(topicError.message) },
          { status: 500 }
        )
      }

      if (!topic) {
        return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 })
      }

      if (topic.is_archived) {
        return NextResponse.json(
          { error: "Le sujet selectionne est archive." },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({
        date: payload.date,
        start_time: payload.startTime,
        end_time: payload.endTime,
        status: payload.status,
        notes: payload.notes,
        topic_id: payload.topicId !== undefined ? nextTopicId : undefined,
      })
      .eq("id", id)
      .select(SESSION_DETAIL_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapSessionsError(error.message) },
        { status: 500 }
      )
    }

    const hydrated = await hydrateSessionActivitiesAssignmentsUsers(
      supabase,
      data.session_activities
    )
    if (!hydrated.ok) {
      return NextResponse.json(
        { error: mapSessionsError(hydrated.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        session_activities: hydrated.data,
      },
    })
  } catch (error) {
    console.error("Erreur sessions/[id] PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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
        { error: "Identifiant seance manquant." },
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

    const { data: existing, error: existingError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: mapSessionsError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (existing.status !== "upcoming") {
      return NextResponse.json(
        {
          error:
            "Annulation impossible: seules les seances qui n'ont pas encore commence peuvent etre modifiees.",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select(SESSION_DETAIL_SELECT)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: mapSessionsError(error.message) },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    const hydrated = await hydrateSessionActivitiesAssignmentsUsers(
      supabase,
      data.session_activities
    )
    if (!hydrated.ok) {
      return NextResponse.json(
        { error: mapSessionsError(hydrated.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        session_activities: hydrated.data,
      },
    })
  } catch (error) {
    console.error("Erreur sessions/[id] DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
