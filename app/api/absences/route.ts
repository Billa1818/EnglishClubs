import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin"
import { getCurrentMember } from "@/lib/auth/server"
import {
  absenceCreateSchema,
  absenceListQuerySchema,
} from "@/lib/validations/phase7"
import { isActiveAdmin, isActiveMember } from "@/app/api/sessions/_shared"
import {
  ABSENCE_SELECT,
  type AbsenceBaseRow,
  hydrateAbsenceRelations,
  isLegacyAbsenceGroupIdRequiredError,
  mapAbsenceError,
  resolveLegacyAbsenceGroupId,
} from "./_shared"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"

type SessionLite = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

function getSessionStartDate(session: SessionLite) {
  const time = session.start_time.length >= 8 ? session.start_time.slice(0, 8) : `${session.start_time}:00`
  const parsed = new Date(`${session.date}T${time}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
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
    const validation = absenceListQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { status, userId, sessionId, page, limit } = validation.data
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
        { error: mapAbsenceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const isAdmin = isActiveAdmin(memberResult.member)
    const reader = isSupabaseAdminConfigured() ? createAdminClient() : supabase

    let query = reader
      .from("absence_requests")
      .select(ABSENCE_SELECT)
      .order("requested_at", { ascending: false })
      .limit(1000)

    if (status) {
      query = query.eq("status", status)
    }

    if (sessionId) {
      query = query.eq("session_id", sessionId)
    }

    if (isAdmin) {
      if (userId) {
        query = query.eq("user_id", userId)
      }
    } else {
      query = query.eq("user_id", user.id)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: mapAbsenceError(error.message) },
        { status: 500 }
      )
    }

    const hydration = await hydrateAbsenceRelations(
      supabase,
      (data ?? []) as AbsenceBaseRow[]
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAbsenceError(hydration.error) },
        { status: 500 }
      )
    }

    const rows = hydration.data
    const total = rows.length
    const start = (page - 1) * limit
    const paginatedRows = rows.slice(start, start + limit)

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
    console.error("Erreur absences GET:", error)
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
    const validation = absenceCreateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Donnees invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const payload = validation.data
    const reason = payload.reason?.trim() || null

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
        { error: mapAbsenceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("id, date, start_time, end_time, status")
      .eq("id", payload.sessionId)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json(
        { error: mapAbsenceError(sessionError.message) },
        { status: 500 }
      )
    }

    const session = (sessionData as SessionLite | null) ?? null
    if (!session) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (session.status !== "upcoming") {
      return NextResponse.json(
        { error: "Tu peux demander une absence uniquement pour une seance a venir." },
        { status: 400 }
      )
    }

    const { data: configData, error: configError } = await supabase
      .from("app_config")
      .select("absence_min_delay_hours")
      .eq("id", APP_CONFIG_SINGLETON_ID)
      .maybeSingle()

    if (configError) {
      return NextResponse.json(
        { error: mapAbsenceError(configError.message) },
        { status: 500 }
      )
    }

    const minDelayHours = configData?.absence_min_delay_hours ?? 24
    const sessionStartDate = getSessionStartDate(session)

    if (!sessionStartDate) {
      return NextResponse.json(
        { error: "Impossible de calculer l'heure de la seance." },
        { status: 400 }
      )
    }

    const now = new Date()
    const diffMs = sessionStartDate.getTime() - now.getTime()
    const minDelayMs = minDelayHours * 60 * 60 * 1000

    if (diffMs <= 0) {
      return NextResponse.json(
        { error: "La seance est deja en cours ou terminee." },
        { status: 400 }
      )
    }

    if (diffMs < minDelayMs) {
      return NextResponse.json(
        {
          error: `Le delai minimum est de ${minDelayHours}h avant le debut de la seance.`,
        },
        { status: 400 }
      )
    }

    const reader = isSupabaseAdminConfigured() ? createAdminClient() : supabase

    const { data: existing, error: existingError } = await reader
      .from("absence_requests")
      .select("id")
      .eq("session_id", payload.sessionId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: mapAbsenceError(existingError.message) },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: "Une demande d'absence existe deja pour cette seance." },
        { status: 409 }
      )
    }

    const requestedAt = new Date().toISOString()
    const writer = isSupabaseAdminConfigured() ? createAdminClient() : supabase
    let insertedData: AbsenceBaseRow | null = null
    let insertError: { message: string } | null = null

    const firstInsert = await writer
      .from("absence_requests")
      .insert({
        session_id: payload.sessionId,
        user_id: user.id,
        reason,
        status: "pending",
        requested_at: requestedAt,
      })
      .select(ABSENCE_SELECT)
      .single()

    insertedData = (firstInsert.data as AbsenceBaseRow | null) ?? null
    insertError = firstInsert.error

    if (insertError && isLegacyAbsenceGroupIdRequiredError(insertError.message)) {
      const fallbackGroupId = await resolveLegacyAbsenceGroupId(supabase)

      if (!fallbackGroupId) {
        return NextResponse.json(
          { error: mapAbsenceError(insertError.message) },
          { status: 500 }
        )
      }

      const retryInsert = await writer
        .from("absence_requests")
        .insert({
          session_id: payload.sessionId,
          user_id: user.id,
          reason,
          status: "pending",
          requested_at: requestedAt,
          group_id: fallbackGroupId,
        })
        .select(ABSENCE_SELECT)
        .single()

      insertedData = (retryInsert.data as AbsenceBaseRow | null) ?? null
      insertError = retryInsert.error
    }

    if (insertError) {
      return NextResponse.json(
        { error: mapAbsenceError(insertError.message) },
        { status: 500 }
      )
    }

    const hydration = await hydrateAbsenceRelations(
      supabase,
      insertedData ? [insertedData] : []
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAbsenceError(hydration.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydration.data[0] }, { status: 201 })
  } catch (error) {
    console.error("Erreur absences POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
