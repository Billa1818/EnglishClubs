import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"

const resetSchema = z.object({
  confirm: z.literal(true),
})

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

function mapResetError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("sessions")) {
    return "La table `sessions` est absente. Execute les scripts SQL de la phase 5."
  }

  if (lower.includes("schema cache")) {
    return "Schema cache stale. Execute `NOTIFY pgrst, 'reload schema';` puis reessaie."
  }

  return message
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
    const validation = resetSchema.safeParse(body)
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
        { error: mapResetError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { count, error: countError } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })

    if (countError) {
      return NextResponse.json(
        { error: mapResetError(countError.message) },
        { status: 500 }
      )
    }

    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .gte("created_at", "1970-01-01T00:00:00.000Z")

    if (deleteError) {
      return NextResponse.json(
        { error: mapResetError(deleteError.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedSessions: count ?? 0,
      },
      message: "Seances, presences et absences reinitialisees.",
    })
  } catch (error) {
    console.error("Erreur settings/reset POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
