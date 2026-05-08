import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"

function mapInvitationError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("invitations")) {
    return "La table `invitations` est absente. Execute `015_recreate_invitations_table.sql` puis reconnecte-toi."
  }

  if (lower.includes("schema cache")) {
    return "Le schema Supabase n'est pas a jour pour `invitations`. Execute `015_recreate_invitations_table.sql`."
  }

  if (lower.includes("column") && lower.includes("invitations")) {
    return "Le schema de `invitations` est incomplet. Execute `015_recreate_invitations_table.sql`."
  }

  return message
}

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

type RouteContext = {
  params: Promise<{
    id: string
  }>
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
      return NextResponse.json({ error: "Identifiant d'invitation manquant." }, { status: 400 })
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
        { error: mapInvitationError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { error } = await supabase.from("invitations").delete().eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: mapInvitationError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur invitations DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
