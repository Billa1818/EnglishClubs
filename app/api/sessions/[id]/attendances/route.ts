import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import {
  attendanceDeclareSchema,
  attendanceListQuerySchema,
} from "@/lib/validations/phase6"
import { isActiveMember, mapSessionsError } from "../../_shared"
import {
  ATTENDANCE_SELECT,
  ATTENDANCE_SELECT_LITE,
  ATTENDANCE_SELECT_MINIMAL,
  type AttendanceBaseRow,
  type AttendanceLiteRow,
  type AttendanceMinimalRow,
  type AttendanceRow,
  hydrateAttendancesProfiles,
  isLegacyAttendanceGroupIdRequiredError,
  mapAttendanceError,
  normalizeAttendanceRows,
  resolveLegacyAttendanceGroupId,
  shouldFallbackToAttendanceInsertWithoutDeclaredAt,
  shouldFallbackToLiteAttendanceSelect,
  shouldFallbackToMinimalAttendanceSelect,
} from "@/app/api/attendances/_shared"

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

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Identifiant seance manquant." }, { status: 400 })
    }

    const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validation = attendanceListQuerySchema.safeParse(queryObject)
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

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json(
        { error: mapAttendanceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    let query = supabase
      .from("attendances")
      .select(ATTENDANCE_SELECT)
      .eq("session_id", id)
      .order("declared_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    let baseRows = normalizeAttendanceRows(
      (data ?? []) as AttendanceBaseRow[] | AttendanceLiteRow[]
    )

    if (error) {
      console.error("Erreur brute insert attendance:", error.message)
      if (!shouldFallbackToLiteAttendanceSelect(error.message)) {
        return NextResponse.json(
          { error: mapAttendanceError(error.message) },
          { status: 500 }
        )
      }

      let liteQuery = supabase
        .from("attendances")
        .select(ATTENDANCE_SELECT_LITE)
        .eq("session_id", id)
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
            .eq("session_id", id)
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

          baseRows = normalizeAttendanceRows((minimalData ?? []) as AttendanceMinimalRow[])
        } else {
          return NextResponse.json(
            { error: mapAttendanceError(liteError.message) },
            { status: 500 }
          )
        }
      } else {
        baseRows = normalizeAttendanceRows((liteData ?? []) as AttendanceLiteRow[])
      }
    }

    const hydration = await hydrateAttendancesProfiles(
      supabase,
      baseRows
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAttendanceError(hydration.error) },
        { status: 500 }
      )
    }

    const rows = hydration.data as AttendanceRow[]
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
    console.error("Erreur sessions/[id]/attendances GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Identifiant seance manquant." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const validation = attendanceDeclareSchema.safeParse(body)
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
        { error: mapAttendanceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", id)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json(
        { error: mapSessionsError(sessionError.message) },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (session.status === "completed" || session.status === "cancelled") {
      return NextResponse.json(
        { error: "Declaration impossible pour une seance terminee ou annulee." },
        { status: 400 }
      )
    }

    const { data: existingData, error: existingError } = await supabase
      .from("attendances")
      .select(ATTENDANCE_SELECT)
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    let existing = existingData
      ? normalizeAttendanceRows([existingData as AttendanceBaseRow])[0]
      : null

    if (existingError) {
      if (!shouldFallbackToLiteAttendanceSelect(existingError.message)) {
        return NextResponse.json(
          { error: mapAttendanceError(existingError.message) },
          { status: 500 }
        )
      }

      const { data: existingLiteData, error: existingLiteError } = await supabase
        .from("attendances")
        .select(ATTENDANCE_SELECT_LITE)
        .eq("session_id", id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (existingLiteError) {
        if (shouldFallbackToMinimalAttendanceSelect(existingLiteError.message)) {
          const { data: existingMinimalData, error: existingMinimalError } = await supabase
            .from("attendances")
            .select(ATTENDANCE_SELECT_MINIMAL)
            .eq("session_id", id)
            .eq("user_id", user.id)
            .maybeSingle()

          if (existingMinimalError) {
            return NextResponse.json(
              { error: mapAttendanceError(existingMinimalError.message) },
              { status: 500 }
            )
          }

          existing = existingMinimalData
            ? normalizeAttendanceRows([existingMinimalData as AttendanceMinimalRow])[0]
            : null
        } else {
          return NextResponse.json(
            { error: mapAttendanceError(existingLiteError.message) },
            { status: 500 }
          )
        }
      } else {
        existing = existingLiteData
          ? normalizeAttendanceRows([existingLiteData as AttendanceLiteRow])[0]
          : null
      }
    }

    if (existing) {
      if (existing.status === "declared") {
        const hydratedExisting = await hydrateAttendancesProfiles(supabase, [existing])
        if (!hydratedExisting.ok) {
          return NextResponse.json(
            { error: mapAttendanceError(hydratedExisting.error) },
            { status: 500 }
          )
        }
        return NextResponse.json({ success: true, data: hydratedExisting.data[0] })
      }

      return NextResponse.json(
        {
          error:
            "Une presence existe deja pour cette seance. Contacte un administrateur pour modification.",
        },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    let insertedData: AttendanceBaseRow | null = null
    let error: { message: string } | null = null

    const insertWithDeclaredAt = await supabase
      .from("attendances")
      .insert({
        session_id: id,
        user_id: user.id,
        status: validation.data.status,
        declared_at: now,
      })
      .select(ATTENDANCE_SELECT)
      .single()

    insertedData = (insertWithDeclaredAt.data as AttendanceBaseRow | null) ?? null
    error = insertWithDeclaredAt.error

    if (error && shouldFallbackToAttendanceInsertWithoutDeclaredAt(error.message)) {
      const insertWithoutDeclaredAt = await supabase
        .from("attendances")
        .insert({
          session_id: id,
          user_id: user.id,
          status: validation.data.status,
        })
        .select(ATTENDANCE_SELECT)
        .single()

      insertedData = (insertWithoutDeclaredAt.data as AttendanceBaseRow | null) ?? null
      error = insertWithoutDeclaredAt.error
    }

    if (error && isLegacyAttendanceGroupIdRequiredError(error.message)) {
      const fallbackGroupId = await resolveLegacyAttendanceGroupId(supabase)

      if (!fallbackGroupId) {
        return NextResponse.json(
          { error: mapAttendanceError(error.message) },
          { status: 500 }
        )
      }

      const legacyPayload = {
        session_id: id,
        user_id: user.id,
        status: validation.data.status,
        group_id: fallbackGroupId,
      }

      const legacyInsert = shouldFallbackToAttendanceInsertWithoutDeclaredAt(error.message)
        ? await supabase
            .from("attendances")
            .insert(legacyPayload)
            .select(ATTENDANCE_SELECT)
            .single()
        : await supabase
            .from("attendances")
            .insert({
              ...legacyPayload,
              declared_at: now,
            })
            .select(ATTENDANCE_SELECT)
            .single()

      insertedData = (legacyInsert.data as AttendanceBaseRow | null) ?? null
      error = legacyInsert.error
    }

    let insertedRows = insertedData
      ? normalizeAttendanceRows([insertedData])
      : []

    if (error) {
      if (!shouldFallbackToLiteAttendanceSelect(error.message)) {
        return NextResponse.json(
          { error: mapAttendanceError(error.message) },
          { status: 500 }
        )
      }

      const { data: insertedLiteData, error: insertedLiteError } = await supabase
        .from("attendances")
        .select(ATTENDANCE_SELECT_LITE)
        .eq("session_id", id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (insertedLiteError) {
        console.error("Erreur brute lecture attendance lite:", insertedLiteError.message)
        if (shouldFallbackToMinimalAttendanceSelect(insertedLiteError.message)) {
          const { data: insertedMinimalData, error: insertedMinimalError } = await supabase
            .from("attendances")
            .select(ATTENDANCE_SELECT_MINIMAL)
            .eq("session_id", id)
            .eq("user_id", user.id)
            .maybeSingle()

          if (insertedMinimalError) {
            console.error(
              "Erreur brute lecture attendance minimal:",
              insertedMinimalError.message
            )
            return NextResponse.json(
              { error: mapAttendanceError(insertedMinimalError.message) },
              { status: 500 }
            )
          }

          insertedRows = insertedMinimalData
            ? normalizeAttendanceRows([insertedMinimalData as AttendanceMinimalRow])
            : []
        } else {
          return NextResponse.json(
            { error: mapAttendanceError(insertedLiteError.message) },
            { status: 500 }
          )
        }
      } else {
        insertedRows = insertedLiteData
          ? normalizeAttendanceRows([insertedLiteData as AttendanceLiteRow])
          : []
      }
    }

    const hydration = await hydrateAttendancesProfiles(
      supabase,
      insertedRows
    )
    if (!hydration.ok) {
      return NextResponse.json(
        { error: mapAttendanceError(hydration.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: hydration.data[0] }, { status: 201 })
  } catch (error) {
    console.error("Erreur sessions/[id]/attendances POST:", error)
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
      return NextResponse.json({ error: "Identifiant seance manquant." }, { status: 400 })
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
        { error: mapAttendanceError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", id)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json(
        { error: mapSessionsError(sessionError.message) },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 })
    }

    if (session.status === "completed" || session.status === "cancelled") {
      return NextResponse.json(
        { error: "Annulation impossible pour une seance terminee ou annulee." },
        { status: 400 }
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from("attendances")
      .select("id, status")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: mapAttendanceError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ error: "Aucune declaration a annuler." }, { status: 404 })
    }

    if (existing.status !== "declared") {
      return NextResponse.json(
        {
          error:
            "Seule une presence declaree et non encore confirmee peut etre annulee.",
        },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase
      .from("attendances")
      .delete()
      .eq("id", existing.id)

    if (deleteError) {
      return NextResponse.json(
        { error: mapAttendanceError(deleteError.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur sessions/[id]/attendances DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
