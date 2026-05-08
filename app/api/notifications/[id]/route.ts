import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { isActiveMember } from "@/app/api/sessions/_shared"
import { notificationUpdateSchema } from "@/lib/validations/phase11"
import {
  mapNotificationsError,
  NOTIFICATION_SELECT,
  type NotificationRow,
} from "../_shared"

type RouteContext = {
  params: Promise<{
    id: string
  }>
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
    const notificationId = id?.trim()

    if (!notificationId) {
      return NextResponse.json(
        { error: "Identifiant notification manquant." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = notificationUpdateSchema.safeParse(body)
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

    const { data: existing, error: existingError } = await supabase
      .from("notifications")
      .select("id")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: mapNotificationsError(existingError.message) },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Notification introuvable." },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: validation.data.isRead,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select(NOTIFICATION_SELECT)
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data as NotificationRow })
  } catch (error) {
    console.error("Erreur notifications/[id] PATCH:", error)
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
    const notificationId = id?.trim()

    if (!notificationId) {
      return NextResponse.json(
        { error: "Identifiant notification manquant." },
        { status: 400 }
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
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select("id")

    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Notification introuvable." },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { id: notificationId } })
  } catch (error) {
    console.error("Erreur notifications/[id] DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
