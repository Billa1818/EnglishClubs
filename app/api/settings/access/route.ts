import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
const accessSchema = z.object({
  accessType: z.enum(["open", "invitation"]),
})

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

function mapAccessError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("app_config")) {
    return "La table `app_config` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("relation") && lower.includes("invitations")) {
    return "La table `invitations` est absente. Execute les scripts SQL de la phase 3."
  }

  return message
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
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json(
        { error: mapAccessError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const [configResult, invitationCountResult] = await Promise.all([
      supabase
        .from("app_config")
        .select("access_type")
        .eq("id", APP_CONFIG_SINGLETON_ID)
        .maybeSingle(),
      supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString()),
    ])

    if (configResult.error) {
      return NextResponse.json(
        { error: mapAccessError(configResult.error.message) },
        { status: 500 }
      )
    }

    if (invitationCountResult.error) {
      return NextResponse.json(
        { error: mapAccessError(invitationCountResult.error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        accessType: configResult.data?.access_type ?? "open",
        activeInvitationCount: invitationCountResult.count ?? 0,
      },
    })
  } catch (error) {
    console.error("Erreur settings/access GET:", error)
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
    const validation = accessSchema.safeParse(body)

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
        { error: mapAccessError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("app_config")
      .update({ access_type: validation.data.accessType })
      .eq("id", APP_CONFIG_SINGLETON_ID)
      .select("access_type")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: mapAccessError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        accessType: data?.access_type ?? validation.data.accessType,
      },
    })
  } catch (error) {
    console.error("Erreur settings/access PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
