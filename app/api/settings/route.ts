import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
const SETTINGS_SELECT =
  "app_name, app_logo_url, rules, absence_min_delay_hours, fcc_reminder_days"
const SETTINGS_SELECT_LEGACY =
  "app_name, rules, absence_min_delay_hours, fcc_reminder_days"

const settingsPatchSchema = z
  .object({
    appName: z.string().trim().min(2).max(120).optional(),
    appLogoUrl: z.string().trim().url().max(2000).optional().nullable(),
    rules: z.string().trim().max(20000).optional().nullable(),
    absenceMinDelayHours: z.coerce.number().int().min(1).max(720).optional(),
    fccReminderDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Aucune modification fournie.",
  })

function isActiveMember(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active"
}

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

function mapSettingsError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("app_config")) {
    return "La table `app_config` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("column") && lower.includes("app_logo_url")) {
    return "La colonne `app_logo_url` est absente. Execute `039_add_app_logo_url.sql` puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (
    lower.includes("column") &&
    (lower.includes("app_name") ||
      lower.includes("rules") ||
      lower.includes("absence_min_delay_hours") ||
      lower.includes("fcc_reminder_days"))
  ) {
    return "Le schema `app_config` est incomplet. Reexecute les scripts SQL de la phase 1."
  }

  return message
}

function mapSettingsRow(
  row:
    | {
        app_name: string
        app_logo_url?: string | null
        rules: string | null
        absence_min_delay_hours: number
        fcc_reminder_days: number
      }
    | null
    | undefined
) {
  return {
    appName: row?.app_name ?? "English Club",
    appLogoUrl: row?.app_logo_url ?? "",
    rules: row?.rules ?? "",
    absenceMinDelayHours: row?.absence_min_delay_hours ?? 24,
    fccReminderDays: row?.fcc_reminder_days ?? 7,
  }
}

function isMissingLogoColumnError(message: string) {
  const lower = message.toLowerCase()
  return lower.includes("column") && lower.includes("app_logo_url")
}

async function fetchSettingsWithFallback(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const primary = await supabase
    .from("app_config")
    .select(SETTINGS_SELECT)
    .eq("id", APP_CONFIG_SINGLETON_ID)
    .maybeSingle()

  if (!primary.error) {
    return {
      ok: true as const,
      data: primary.data as {
        app_name: string
        app_logo_url?: string | null
        rules: string | null
        absence_min_delay_hours: number
        fcc_reminder_days: number
      } | null,
    }
  }

  if (!isMissingLogoColumnError(primary.error.message)) {
    return {
      ok: false as const,
      error: primary.error.message,
    }
  }

  const legacy = await supabase
    .from("app_config")
    .select(SETTINGS_SELECT_LEGACY)
    .eq("id", APP_CONFIG_SINGLETON_ID)
    .maybeSingle()

  if (legacy.error) {
    return {
      ok: false as const,
      error: legacy.error.message,
    }
  }

  return {
    ok: true as const,
    data: legacy.data as {
      app_name: string
      app_logo_url?: string | null
      rules: string | null
      absence_min_delay_hours: number
      fcc_reminder_days: number
    } | null,
  }
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
        { error: mapSettingsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const settingsResult = await fetchSettingsWithFallback(supabase)
    if (!settingsResult.ok) {
      return NextResponse.json(
        { error: mapSettingsError(settingsResult.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mapSettingsRow(settingsResult.data),
    })
  } catch (error) {
    console.error("Erreur settings GET:", error)
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
    const validation = settingsPatchSchema.safeParse(body)

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
        { error: mapSettingsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const payload = validation.data
    const updates: {
      app_name?: string
      app_logo_url?: string | null
      rules?: string | null
      absence_min_delay_hours?: number
      fcc_reminder_days?: number
    } = {}

    if (payload.appName !== undefined) {
      updates.app_name = payload.appName
    }

    if (payload.rules !== undefined) {
      updates.rules = payload.rules ? payload.rules : null
    }

    if (payload.appLogoUrl !== undefined) {
      updates.app_logo_url = payload.appLogoUrl ? payload.appLogoUrl : null
    }

    if (payload.absenceMinDelayHours !== undefined) {
      updates.absence_min_delay_hours = payload.absenceMinDelayHours
    }

    if (payload.fccReminderDays !== undefined) {
      updates.fcc_reminder_days = payload.fccReminderDays
    }

    const { error: updateError } = await supabase
      .from("app_config")
      .update(updates)
      .eq("id", APP_CONFIG_SINGLETON_ID)

    if (updateError) {
      return NextResponse.json(
        { error: mapSettingsError(updateError.message) },
        { status: 500 }
      )
    }

    const settingsResult = await fetchSettingsWithFallback(supabase)
    if (!settingsResult.ok) {
      return NextResponse.json(
        { error: mapSettingsError(settingsResult.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mapSettingsRow(settingsResult.data),
    })
  } catch (error) {
    console.error("Erreur settings PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
