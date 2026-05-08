import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { invitationCreateSchema } from "@/lib/validations/phase3"
import { sendInvitationEmail } from "@/lib/email/invitations"
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin"

function getBaseOrigin(requestUrl: string) {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(requestUrl).origin
}

function buildInviteUrl(requestUrl: string, token: string) {
  return `${getBaseOrigin(requestUrl)}/register?token=${token}`
}

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

type InvitationRow = {
  id: string
  token: string
  type: "link" | "email"
  email: string | null
  expires_at: string
  used_at: string | null
  created_by: string
  used_by: string | null
  created_at: string
  updated_at: string
}

type UsedProfile = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
}

type MemberByEmailResult =
  | { ok: true; isMember: boolean }
  | { ok: false; error: string }

const INVITATION_SELECT =
  "id, token, type, email, expires_at, used_at, created_by, used_by, created_at, updated_at"

async function attachUsedProfiles(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  invitations: InvitationRow[]
) {
  const usedIds = Array.from(
    new Set(
      invitations
        .map((invitation) => invitation.used_by)
        .filter((value): value is string => !!value)
    )
  )

  if (usedIds.length === 0) {
    return invitations.map((invitation) => ({
      ...invitation,
      used_profile: null,
    }))
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, pseudo")
    .in("id", usedIds)

  if (error) {
    throw new Error(error.message)
  }

  const profileById = new Map<string, UsedProfile>()
  ;(profiles ?? []).forEach((profile) => {
    profileById.set(profile.id, profile)
  })

  return invitations.map((invitation) => ({
    ...invitation,
    used_profile: invitation.used_by
      ? profileById.get(invitation.used_by) ?? null
      : null,
  }))
}

async function checkIfEmailAlreadyMember(
  normalizedEmail: string
): Promise<MemberByEmailResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: true, isMember: false }
  }

  const adminSupabase = createAdminClient()
  const perPage = 200
  const maxPages = 25

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const users = data.users ?? []
    const matchedUser = users.find(
      (candidate) => (candidate.email ?? "").toLowerCase() === normalizedEmail
    )

    if (matchedUser) {
      const { data: member, error: memberError } = await adminSupabase
        .from("members")
        .select("status")
        .eq("user_id", matchedUser.id)
        .maybeSingle()

      if (memberError) {
        return { ok: false, error: memberError.message }
      }

      return { ok: true, isMember: !!member && member.status !== "removed" }
    }

    if (users.length < perPage) {
      break
    }
  }

  return { ok: true, isMember: false }
}

export async function GET(request: NextRequest) {
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
        { error: mapInvitationError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("invitations")
      .select(INVITATION_SELECT)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json(
        { error: mapInvitationError(error.message) },
        { status: 500 }
      )
    }

    const invitationsWithProfile = await attachUsedProfiles(
      supabase,
      (data ?? []) as InvitationRow[]
    )

    return NextResponse.json({
      success: true,
      data: invitationsWithProfile.map((invitation) => ({
        ...invitation,
        invite_url: buildInviteUrl(request.url, invitation.token),
      })),
    })
  } catch (error) {
    console.error("Erreur invitations GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
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
    const validation = invitationCreateSchema.safeParse(body)

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
        { error: mapInvitationError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const normalizedEmail = validation.data.email?.trim().toLowerCase() || null

    if (validation.data.type === "email" && normalizedEmail) {
      const memberByEmailResult = await checkIfEmailAlreadyMember(normalizedEmail)
      if (!memberByEmailResult.ok) {
        return NextResponse.json(
          { error: mapInvitationError(memberByEmailResult.error) },
          { status: 500 }
        )
      }

      if (memberByEmailResult.isMember) {
        return NextResponse.json(
          {
            error:
              "Cet utilisateur est deja membre du groupe. Aucune invitation n'a ete envoyee.",
          },
          { status: 409 }
        )
      }

      const nowIso = new Date().toISOString()
      const { data: existingInvitation, error: existingInvitationError } = await supabase
        .from("invitations")
        .select(INVITATION_SELECT)
        .eq("type", "email")
        .ilike("email", normalizedEmail)
        .is("used_at", null)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingInvitationError) {
        return NextResponse.json(
          { error: mapInvitationError(existingInvitationError.message) },
          { status: 500 }
        )
      }

      if (existingInvitation) {
        const existingInviteUrl = buildInviteUrl(request.url, existingInvitation.token)
        const emailResult = await sendInvitationEmail({
          to: normalizedEmail,
          inviteUrl: existingInviteUrl,
          expiresAtIso: existingInvitation.expires_at,
        })

        if (!emailResult.ok) {
          if (emailResult.technicalMessage) {
            console.error("Erreur re-envoi invitation email:", emailResult.technicalMessage)
          }

          return NextResponse.json({ error: emailResult.error }, { status: 502 })
        }

        const [invitationWithProfile] = await attachUsedProfiles(supabase, [
          existingInvitation as InvitationRow,
        ])

        return NextResponse.json({
          success: true,
          resent: true,
          data: {
            ...invitationWithProfile,
            invite_url: existingInviteUrl,
          },
        })
      }
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validation.data.expiresInDays)

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        type: validation.data.type,
        email: normalizedEmail,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select(INVITATION_SELECT)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: mapInvitationError(error?.message || "Creation impossible.") },
        { status: 500 }
      )
    }

    const inviteUrl = buildInviteUrl(request.url, data.token)

    if (data.type === "email" && data.email) {
      const emailResult = await sendInvitationEmail({
        to: data.email,
        inviteUrl,
        expiresAtIso: data.expires_at,
      })

      if (!emailResult.ok) {
        // Keep data consistent: if email sending fails, revoke the new invitation.
        const { error: rollbackError } = await supabase
          .from("invitations")
          .delete()
          .eq("id", data.id)

        if (rollbackError) {
          console.error("Erreur rollback invitation email:", rollbackError.message)
        }

        if (emailResult.technicalMessage) {
          console.error("Erreur envoi invitation email:", emailResult.technicalMessage)
        }

        return NextResponse.json({ error: emailResult.error }, { status: 502 })
      }
    }

    const [invitationWithProfile] = await attachUsedProfiles(supabase, [
      data as InvitationRow,
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          ...invitationWithProfile,
          invite_url: inviteUrl,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur invitations POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
