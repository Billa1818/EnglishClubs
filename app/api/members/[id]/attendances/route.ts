import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { memberAttendanceHistoryQuerySchema } from "@/lib/validations/phase6"
import { isActiveAdmin, isActiveMember } from "@/app/api/sessions/_shared"
import {
  ATTENDANCE_SELECT,
  ATTENDANCE_SELECT_LITE,
  ATTENDANCE_SELECT_MINIMAL,
  mapAttendanceError,
  normalizeAttendanceRows,
  shouldFallbackToLiteAttendanceSelect,
  shouldFallbackToMinimalAttendanceSelect,
} from "@/app/api/attendances/_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type AttendanceHistoryRow = {
  id: string
  session_id: string
  user_id: string
  status: "declared" | "confirmed" | "absent" | "excused"
  declared_at: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  created_at: string
  updated_at: string
  session: {
    id: string
    date: string
    start_time: string
    end_time: string
    status: "upcoming" | "ongoing" | "completed" | "cancelled"
  } | null
}

type SessionLiteRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

function mapMembersError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("members")) {
    return "La table `members` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("relation") && lower.includes("profiles")) {
    return "La table `profiles` est absente. Execute les scripts SQL de la phase 1."
  }

  return message
}

async function hydrateAttendanceSessions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  rows: Omit<AttendanceHistoryRow, "session">[]
) {
  const sessionIds = Array.from(new Set(rows.map((row) => row.session_id).filter(Boolean)))

  if (sessionIds.length === 0) {
    return {
      ok: true as const,
      data: rows.map((row) => ({ ...row, session: null })),
    }
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("id, date, start_time, end_time, status")
    .in("id", sessionIds)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const sessionMap = new Map<string, SessionLiteRow>()
  for (const session of (data ?? []) as SessionLiteRow[]) {
    sessionMap.set(session.id, session)
  }

  return {
    ok: true as const,
    data: rows.map((row) => ({
      ...row,
      session: sessionMap.get(row.session_id) ?? null,
    })),
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Identifiant membre manquant." }, { status: 400 })
    }

    const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validation = memberAttendanceHistoryQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { status, page, limit } = validation.data
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const requesterResult = await getCurrentMember(supabase, user.id)
    if (!requesterResult.ok) {
      return NextResponse.json(
        { error: mapAttendanceError(requesterResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(requesterResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: targetMember, error: targetMemberError } = await supabase
      .from("members")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle()

    if (targetMemberError) {
      return NextResponse.json(
        { error: mapMembersError(targetMemberError.message) },
        { status: 500 }
      )
    }

    if (!targetMember) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
    }

    const canReadTarget =
      isActiveAdmin(requesterResult.member) || targetMember.user_id === user.id
    if (!canReadTarget) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    let query = supabase
      .from("attendances")
      .select(ATTENDANCE_SELECT)
      .eq("user_id", targetMember.user_id)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    let baseRows = normalizeAttendanceRows(data as never)

    if (error) {
      if (!shouldFallbackToLiteAttendanceSelect(error.message)) {
        return NextResponse.json(
          { error: mapAttendanceError(error.message) },
          { status: 500 }
        )
      }

      let liteQuery = supabase
        .from("attendances")
        .select(ATTENDANCE_SELECT_LITE)
        .eq("user_id", targetMember.user_id)
        .order("created_at", { ascending: false })
        .limit(1000)

      if (status) {
        liteQuery = liteQuery.eq("status", status)
      }

      const { data: liteData, error: liteError } = await liteQuery
      if (liteError) {
        if (shouldFallbackToMinimalAttendanceSelect(liteError.message)) {
          let minimalQuery = supabase
            .from("attendances")
            .select(ATTENDANCE_SELECT_MINIMAL)
            .eq("user_id", targetMember.user_id)
            .limit(1000)

          if (status) {
            minimalQuery = minimalQuery.eq("status", status)
          }

          const { data: minimalData, error: minimalError } = await minimalQuery
          if (minimalError) {
            return NextResponse.json(
              { error: mapAttendanceError(minimalError.message) },
              { status: 500 }
            )
          }

          baseRows = normalizeAttendanceRows(minimalData as never)
        } else {
          return NextResponse.json(
            { error: mapAttendanceError(liteError.message) },
            { status: 500 }
          )
        }
      } else {
        baseRows = normalizeAttendanceRows(liteData as never)
      }
    }

    const hydration = await hydrateAttendanceSessions(
      supabase,
      baseRows as Omit<AttendanceHistoryRow, "session">[]
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAttendanceError(hydration.error) },
        { status: 500 }
      )
    }

    const rows = hydration.data as AttendanceHistoryRow[]
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
    console.error("Erreur members/[id]/attendances GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
