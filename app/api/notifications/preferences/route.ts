import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { isActiveMember } from "@/app/api/sessions/_shared"
import { notificationPreferencesPatchSchema } from "@/lib/validations/phase11"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mapNotificationsError,
  type NotificationPreferenceRow,
} from "../_shared"

type NotificationPreferenceDto = {
  notificationType: string
  inApp: boolean
  email: boolean
}

function normalizeNotificationType(value: string) {
  return value.trim().toLowerCase()
}

function mergeWithDefaults(rows: NotificationPreferenceRow[] | null | undefined) {
  const map = new Map<string, NotificationPreferenceDto>()

  for (const [notificationType, defaults] of Object.entries(
    DEFAULT_NOTIFICATION_PREFERENCES
  )) {
    map.set(notificationType, {
      notificationType,
      inApp: defaults.inApp,
      email: defaults.email,
    })
  }

  for (const row of rows ?? []) {
    const notificationType = normalizeNotificationType(row.notification_type)
    if (!notificationType) {
      continue
    }

    map.set(notificationType, {
      notificationType,
      inApp: row.in_app,
      email: row.email,
    })
  }

  return Array.from(map.values()).sort((a, b) =>
    a.notificationType.localeCompare(b.notificationType, "fr")
  )
}

export async function GET() {
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
      .from("notification_preferences")
      .select("id, user_id, notification_type, in_app, email, created_at, updated_at")
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: mergeWithDefaults((data ?? []) as NotificationPreferenceRow[]),
      },
    })
  } catch (error) {
    console.error("Erreur notifications/preferences GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = notificationPreferencesPatchSchema.safeParse(body)
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

    const rows = validation.data.preferences.map((item) => ({
      user_id: user.id,
      notification_type: normalizeNotificationType(item.notificationType),
      in_app: item.inApp,
      email: item.email,
    }))

    const dedupedRows = Array.from(
      new Map(rows.map((row) => [row.notification_type, row])).values()
    ).filter((row) => row.notification_type.length > 0)

    if (dedupedRows.length === 0) {
      return NextResponse.json(
        {
          error: "Donnees invalides",
          details: {
            formErrors: ["Aucune preference valide a enregistrer."],
            fieldErrors: {},
          },
        },
        { status: 400 }
      )
    }

    const { error: upsertError } = await supabase
      .from("notification_preferences")
      .upsert(dedupedRows, {
        onConflict: "user_id,notification_type",
      })

    if (upsertError) {
      return NextResponse.json(
        { error: mapNotificationsError(upsertError.message) },
        { status: 500 }
      )
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("id, user_id, notification_type, in_app, email, created_at, updated_at")
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: mergeWithDefaults((data ?? []) as NotificationPreferenceRow[]),
      },
    })
  } catch (error) {
    console.error("Erreur notifications/preferences PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
