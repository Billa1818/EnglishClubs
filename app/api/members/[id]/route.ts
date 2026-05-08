import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { memberUpdateSchema } from "@/lib/validations/phase3"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function mapMembersError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("members")) {
    return "La table `members` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("relation") && lower.includes("profiles")) {
    return "La table `profiles` est absente. Execute les scripts SQL de la phase 1."
  }

  return message
}

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

async function getTargetMember(
  memberId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  return supabase
    .from("members")
    .select(
      "id, user_id, status, role, joined_at, created_at, updated_at, profile:profiles!members_user_id_fkey(id, first_name, last_name, pseudo, photo_url, english_level, created_at, updated_at)"
    )
    .eq("id", memberId)
    .maybeSingle()
}

async function countActiveAdmins(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { count, error } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("role", "admin")

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const, count: count ?? 0 }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Identifiant membre manquant." }, { status: 400 })
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
        { error: mapMembersError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await getTargetMember(id, supabase)

    if (error) {
      return NextResponse.json(
        { error: mapMembersError(error.message) },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur members/[id] GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
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
    if (!id) {
      return NextResponse.json({ error: "Identifiant membre manquant." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const validation = memberUpdateSchema.safeParse(body)

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
        { error: mapMembersError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: targetMember, error: targetMemberError } = await getTargetMember(
      id,
      supabase
    )

    if (targetMemberError) {
      return NextResponse.json(
        { error: mapMembersError(targetMemberError.message) },
        { status: 500 }
      )
    }

    if (!targetMember) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
    }

    const newRole = validation.data.role ?? targetMember.role
    const newStatus = validation.data.status ?? targetMember.status
    const adminWillLosePrivileges =
      targetMember.role === "admin" &&
      targetMember.status === "active" &&
      (newRole !== "admin" || newStatus !== "active")

    if (adminWillLosePrivileges) {
      const adminsCountResult = await countActiveAdmins(supabase)
      if (!adminsCountResult.ok) {
        return NextResponse.json(
          { error: mapMembersError(adminsCountResult.error) },
          { status: 500 }
        )
      }

      if (adminsCountResult.count <= 1) {
        return NextResponse.json(
          { error: "Impossible de retirer le dernier administrateur actif." },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from("members")
      .update({
        status: validation.data.status,
        role: validation.data.role,
      })
      .eq("id", id)
      .select("id, user_id, status, role, joined_at, created_at, updated_at")
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapMembersError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur members/[id] PATCH:", error)
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
      return NextResponse.json({ error: "Identifiant membre manquant." }, { status: 400 })
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
        { error: mapMembersError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: targetMember, error: targetMemberError } = await getTargetMember(
      id,
      supabase
    )

    if (targetMemberError) {
      return NextResponse.json(
        { error: mapMembersError(targetMemberError.message) },
        { status: 500 }
      )
    }

    if (!targetMember) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
    }

    if (targetMember.role === "admin" && targetMember.status === "active") {
      const adminsCountResult = await countActiveAdmins(supabase)
      if (!adminsCountResult.ok) {
        return NextResponse.json(
          { error: mapMembersError(adminsCountResult.error) },
          { status: 500 }
        )
      }

      if (adminsCountResult.count <= 1) {
        return NextResponse.json(
          { error: "Impossible de retirer le dernier administrateur actif." },
          { status: 409 }
        )
      }
    }

    // Soft delete: preserve relational integrity for history tables.
    const { error } = await supabase
      .from("members")
      .update({
        status: "removed",
        role: "member",
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: mapMembersError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur members/[id] DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
