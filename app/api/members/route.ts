import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { membersListQuerySchema } from "@/lib/validations/phase3"

type MemberWithProfile = {
  id: string
  user_id: string
  status: "pending" | "active" | "suspended" | "removed"
  role: "admin" | "member"
  joined_at: string
  created_at: string
  updated_at: string
  profile: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
    photo_url: string | null
    english_level: "beginner" | "intermediate" | "advanced"
    created_at: string
    updated_at: string
  } | null
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

function applySearchFilter(rows: MemberWithProfile[], search: string | undefined) {
  if (!search) {
    return rows
  }

  const needle = search.toLowerCase()
  return rows.filter((row) => {
    const firstName = row.profile?.first_name?.toLowerCase() || ""
    const lastName = row.profile?.last_name?.toLowerCase() || ""
    const pseudo = row.profile?.pseudo?.toLowerCase() || ""
    return (
      firstName.includes(needle) ||
      lastName.includes(needle) ||
      pseudo.includes(needle) ||
      row.user_id.toLowerCase().includes(needle)
    )
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

    const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validation = membersListQuerySchema.safeParse(queryObject)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Parametres invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { status, role, search, page, limit } = validation.data
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

    let query = supabase
      .from("members")
      .select(
        "id, user_id, status, role, joined_at, created_at, updated_at, profile:profiles!members_user_id_fkey(id, first_name, last_name, pseudo, photo_url, english_level, created_at, updated_at)"
      )
      .order("joined_at", { ascending: false })
      .limit(1000)

    if (status) {
      query = query.eq("status", status)
    }

    if (role) {
      query = query.eq("role", role)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: mapMembersError(error.message) },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as MemberWithProfile[]
    const filteredRows = applySearchFilter(rows, search)
    const total = filteredRows.length
    const start = (page - 1) * limit
    const paginatedRows = filteredRows.slice(start, start + limit)

    return NextResponse.json({
      success: true,
      data: paginatedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error("Erreur members GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
