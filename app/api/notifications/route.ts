import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { isActiveMember } from "@/app/api/sessions/_shared"
import { notificationListQuerySchema } from "@/lib/validations/phase11"
import {
  mapNotificationsError,
  NOTIFICATION_SELECT,
  type NotificationRow,
} from "./_shared"

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

    if (request.nextUrl.searchParams.has("unreadOnly")) {
      queryObject.unreadOnly = parseBooleanQuery(
        request.nextUrl.searchParams.get("unreadOnly")
      )
    }

    const validation = notificationListQuerySchema.safeParse(queryObject)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { unreadOnly, page, limit } = validation.data
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
      return NextResponse.json(
        { error: mapNotificationsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    const { count: unreadCount, error: unreadCountError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    if (unreadCountError) {
      return NextResponse.json(
        { error: mapNotificationsError(unreadCountError.message) },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as NotificationRow[]
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
      stats: {
        unreadCount: unreadCount ?? 0,
      },
    })
  } catch (error) {
    console.error("Erreur notifications GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

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
      return NextResponse.json(
        { error: mapNotificationsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .select("id")

    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: data?.length ?? 0,
      },
    })
  } catch (error) {
    console.error("Erreur notifications DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
