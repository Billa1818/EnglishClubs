import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"

const TABLES_TO_EXPORT = [
  "app_config",
  "profiles",
  "members",
  "invitations",
  "activities",
  "sessions",
  "session_activities",
  "session_activity_assignments",
  "attendances",
  "absence_requests",
  "topics",
  "topic_usages",
  "activity_selection_cycles",
  "activity_selections",
  "fcc_progressions",
] as const

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

function mapExportError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("does not exist")) {
    return "Une ou plusieurs tables sont absentes. Termine d'abord les migrations SQL."
  }

  if (lower.includes("schema cache")) {
    return "Schema cache stale. Execute `NOTIFY pgrst, 'reload schema';` puis reessaie."
  }

  return message
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const format = request.nextUrl.searchParams.get("format")?.toLowerCase() || "json"
    if (format !== "json") {
      return NextResponse.json(
        { error: "Format non supporte. Utilise `format=json`." },
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
        { error: mapExportError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const supabaseAny = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string, options?: { count?: "exact"; head?: boolean }) => {
          limit: (value: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
        }
      }
    }

    const exportPayload: Record<string, unknown> = {}

    for (const table of TABLES_TO_EXPORT) {
      const { data, error } = await supabaseAny
        .from(table)
        .select("*")
        .limit(10000)

      if (error) {
        return NextResponse.json(
          { error: mapExportError(error.message) },
          { status: 500 }
        )
      }

      exportPayload[table] = data ?? []
    }

    const generatedAt = new Date()
    const filename = `englishclub-export-${generatedAt.toISOString().slice(0, 10)}.json`
    const body = JSON.stringify(
      {
        generatedAt: generatedAt.toISOString(),
        generatedBy: user.id,
        format: "json",
        tables: exportPayload,
      },
      null,
      2
    )

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename=\"${filename}\"`,
      },
    })
  } catch (error) {
    console.error("Erreur settings/export GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
