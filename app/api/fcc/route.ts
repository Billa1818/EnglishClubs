import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { fccListQuerySchema, fccUpsertSchema } from "@/lib/validations/phase10"
import {
  FCC_SELECT,
  type FccRow,
  isActiveAdmin,
  isActiveMember,
  mapFccError,
  withSignedScreenshots,
} from "./_shared"

function applySearchFilter(rows: FccRow[], search: string | undefined) {
  if (!search) {
    return rows
  }

  const needle = search.toLowerCase()
  return rows.filter((row) => {
    const haystack = [
      row.track,
      row.level,
      row.certificate_name ?? "",
      row.user?.first_name ?? "",
      row.user?.last_name ?? "",
      row.user?.pseudo ?? "",
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

    const validation = fccListQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { status, userId, search, page, limit } = validation.data
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json({ error: mapFccError(memberResult.error) }, { status: 500 })
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    let query = supabase
      .from("fcc_progressions")
      .select(FCC_SELECT)
      .order("updated_at", { ascending: false })
      .limit(1000)

    if (status === "pending") {
      query = query.is("validated_at", null)
    } else if (status === "validated") {
      query = query.not("validated_at", "is", null)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: mapFccError(error.message) }, { status: 500 })
    }

    const rows = (data ?? []) as FccRow[]
    const filteredRows = applySearchFilter(rows, search)
    const total = filteredRows.length
    const start = (page - 1) * limit
    const paginatedRows = filteredRows.slice(start, start + limit)
    const isAdmin = isActiveAdmin(memberResult.member)

    const rowsWithScreenshots = await withSignedScreenshots(supabase, paginatedRows, {
      viewerId: user.id,
      isAdmin,
    })

    return NextResponse.json({
      success: true,
      data: rowsWithScreenshots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error("Erreur fcc GET:", error)
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
    const validation = fccUpsertSchema.safeParse(body)
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
    const certificateName = payload.certificateName?.trim() || null

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json({ error: mapFccError(memberResult.error) }, { status: 500 })
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    if (payload.id) {
      const { data: existing, error: existingError } = await supabase
        .from("fcc_progressions")
        .select("id, user_id")
        .eq("id", payload.id)
        .maybeSingle()

      if (existingError) {
        return NextResponse.json({ error: mapFccError(existingError.message) }, { status: 500 })
      }

      if (!existing) {
        return NextResponse.json({ error: "Progression introuvable." }, { status: 404 })
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json(
          { error: "Tu ne peux modifier que ta propre progression." },
          { status: 403 }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from("fcc_progressions")
        .update({
          track: payload.track,
          level: payload.level,
          modules_completed: payload.modulesCompleted,
          certificate_name: certificateName,
          validated_by: null,
          validated_at: null,
        })
        .eq("id", payload.id)
        .eq("user_id", user.id)
        .select(FCC_SELECT)
        .single()

      if (updateError) {
        return NextResponse.json({ error: mapFccError(updateError.message) }, { status: 500 })
      }

      const [withScreenshot] = await withSignedScreenshots(supabase, [updated as FccRow], {
        viewerId: user.id,
        isAdmin: isActiveAdmin(memberResult.member),
      })

      return NextResponse.json({ success: true, data: withScreenshot })
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("fcc_progressions")
      .upsert(
        {
          user_id: user.id,
          track: payload.track,
          level: payload.level,
          modules_completed: payload.modulesCompleted,
          certificate_name: certificateName,
          validated_by: null,
          validated_at: null,
        },
        {
          onConflict: "user_id,track",
        }
      )
      .select(FCC_SELECT)
      .single()

    if (upsertError) {
      return NextResponse.json({ error: mapFccError(upsertError.message) }, { status: 500 })
    }

    const [withScreenshot] = await withSignedScreenshots(supabase, [upserted as FccRow], {
      viewerId: user.id,
      isAdmin: isActiveAdmin(memberResult.member),
    })

    return NextResponse.json({ success: true, data: withScreenshot })
  } catch (error) {
    console.error("Erreur fcc POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
