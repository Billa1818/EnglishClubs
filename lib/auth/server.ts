import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "@/lib/supabase/types"
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
type MemberStatus = Tables<"members">["status"]
type MemberRole = Tables<"members">["role"]

export function getRequestOrigin(requestUrl: string) {
  return new URL(requestUrl).origin
}

export function buildAuthRedirectUrl(requestUrl: string, pathname: string) {
  const baseOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || getRequestOrigin(requestUrl)
  return `${baseOrigin}${pathname}`
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }
  return value.trim()
}

function getProfileSeeds(user: User) {
  const metadata = user.user_metadata ?? {}
  const firstName = normalizeString(metadata.first_name)
  const lastName = normalizeString(metadata.last_name)
  const englishLevelValue = normalizeString(metadata.english_level)
  const requestedPseudo = normalizeString(metadata.pseudo)

  const localEmail = normalizeString(user.email).split("@")[0] || "member"

  const englishLevel: Tables<"profiles">["english_level"] =
    englishLevelValue === "intermediate" || englishLevelValue === "advanced"
      ? englishLevelValue
      : "beginner"

  return {
    firstName: firstName || "Membre",
    lastName: lastName || "English Club",
    englishLevel,
    pseudoCandidates: [
      requestedPseudo,
      localEmail.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32),
      `member-${user.id.slice(0, 8)}`,
    ].filter(Boolean),
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getInvitationTokenFromMetadata(user: User) {
  const token = normalizeString(user.user_metadata?.invitation_token)
  if (!token || !isUuid(token)) {
    return null
  }
  return token
}

function isMissingSchemaError(message: string) {
  const lower = message.toLowerCase()
  return (
    (lower.includes("relation") && lower.includes("does not exist")) ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache")
  )
}

type ReconcileMemberAccessResult =
  | {
      ok: true
      member: { status: MemberStatus; role: MemberRole } | null
      repaired: boolean
    }
  | {
      ok: false
      error: string
    }

async function readInvitationConsumedState(
  adminSupabase: SupabaseClient<Database>,
  user: User
) {
  const token = getInvitationTokenFromMetadata(user)
  if (!token) {
    return { ok: true as const, consumed: false as const }
  }

  const { data, error } = await adminSupabase
    .from("invitations")
    .select("used_at, used_by")
    .eq("token", token)
    .maybeSingle()

  if (error) {
    if (isMissingSchemaError(error.message)) {
      return { ok: true as const, consumed: false as const }
    }
    return { ok: false as const, error: error.message }
  }

  return {
    ok: true as const,
    consumed: !!data?.used_at && data.used_by === user.id,
  }
}

async function computeBootstrapRole(adminSupabase: SupabaseClient<Database>) {
  const { count, error } = await adminSupabase
    .from("members")
    .select("id", { head: true, count: "exact" })
    .eq("status", "active")

  if (error) {
    if (isMissingSchemaError(error.message)) {
      return { ok: true as const, role: "member" as MemberRole }
    }
    return { ok: false as const, error: error.message }
  }

  return {
    ok: true as const,
    role: (count ?? 0) === 0 ? ("admin" as MemberRole) : ("member" as MemberRole),
  }
}

export async function reconcileMemberAccessForUser(
  user: User
): Promise<ReconcileMemberAccessResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: true, member: null, repaired: false }
  }

  const adminSupabase = createAdminClient()

  const [memberStateResult, invitationStateResult] = await Promise.all([
    adminSupabase
      .from("members")
      .select("status, role")
      .eq("user_id", user.id)
      .maybeSingle(),
    readInvitationConsumedState(adminSupabase, user),
  ])

  if (memberStateResult.error) {
    if (isMissingSchemaError(memberStateResult.error.message)) {
      return { ok: true, member: null, repaired: false }
    }
    return { ok: false, error: memberStateResult.error.message }
  }

  if (!invitationStateResult.ok) {
    return { ok: false, error: invitationStateResult.error }
  }

  const canAutoActivate = invitationStateResult.consumed

  const existingMember = memberStateResult.data

  if (!existingMember) {
    const bootstrapRoleResult = await computeBootstrapRole(adminSupabase)
    if (!bootstrapRoleResult.ok) {
      return { ok: false, error: bootstrapRoleResult.error }
    }

    const insertedStatus: MemberStatus = canAutoActivate ? "active" : "pending"
    const insertedRole: MemberRole =
      insertedStatus === "active" ? bootstrapRoleResult.role : "member"

    const { data: inserted, error: insertError } = await adminSupabase
      .from("members")
      .insert({
        user_id: user.id,
        status: insertedStatus,
        role: insertedRole,
        joined_at: new Date().toISOString(),
      })
      .select("status, role")
      .maybeSingle()

    if (insertError) {
      if (isMissingSchemaError(insertError.message)) {
        return { ok: true, member: null, repaired: false }
      }
      return { ok: false, error: insertError.message }
    }

    return {
      ok: true,
      member: {
        status: inserted?.status ?? insertedStatus,
        role: inserted?.role ?? insertedRole,
      },
      repaired: true,
    }
  }

  if (existingMember.status === "pending" && canAutoActivate) {
    const { data: updated, error: updateError } = await adminSupabase
      .from("members")
      .update({ status: "active" })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("status, role")
      .maybeSingle()

    if (updateError) {
      if (isMissingSchemaError(updateError.message)) {
        return { ok: true, member: existingMember, repaired: false }
      }
      return { ok: false, error: updateError.message }
    }

    return {
      ok: true,
      member: {
        status: updated?.status ?? "active",
        role: updated?.role ?? existingMember.role,
      },
      repaired: true,
    }
  }

  return { ok: true, member: existingMember, repaired: false }
}

export async function verifyInvitationToken(
  supabase: SupabaseClient<Database>,
  token: string,
  email?: string
) {
  const normalizedToken = normalizeString(token)
  if (!normalizedToken || !isUuid(normalizedToken)) {
    return { ok: true as const, valid: false as const, invitation: null }
  }

  const { data, error } = await supabase.rpc("verify_invitation_token", {
    p_token: normalizedToken,
    p_email: normalizeString(email) || undefined,
  })

  if (error) {
    return {
      ok: false as const,
      error:
        "Verification d'invitation indisponible. Execute les scripts SQL de la phase 3.",
    }
  }

  const invitation = Array.isArray(data) ? data[0] : null
  return {
    ok: true as const,
    valid: !!invitation,
    invitation,
  }
}

export async function consumeInvitationTokenForUser(
  supabase: SupabaseClient<Database>,
  user: User
) {
  const token = getInvitationTokenFromMetadata(user)
  if (!token) {
    return { ok: true as const, consumed: false as const }
  }

  const { data, error } = await supabase.rpc("consume_invitation_token", {
    p_token: token,
    p_user_id: user.id,
    p_email: normalizeString(user.email) || undefined,
  })

  if (error) {
    // Non-blocking: profile sync must stay resilient even if invitation scripts
    // are not yet installed.
    return { ok: true as const, consumed: false as const }
  }

  return {
    ok: true as const,
    consumed: data === true,
  }
}

export async function syncProfileFromUserMetadata(
  supabase: SupabaseClient<Database>,
  user: User
) {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfileError) {
    return { ok: false as const, error: existingProfileError.message }
  }

  if (existingProfile) {
    await consumeInvitationTokenForUser(supabase, user)
    return { ok: true as const }
  }

  const seeds = getProfileSeeds(user)

  for (const candidatePseudo of seeds.pseudoCandidates) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      first_name: seeds.firstName,
      last_name: seeds.lastName,
      pseudo: candidatePseudo,
      english_level: seeds.englishLevel,
    })

    if (!error) {
      await consumeInvitationTokenForUser(supabase, user)
      return { ok: true as const }
    }

    if (error.code === "23505") {
      continue
    }

    return { ok: false as const, error: error.message }
  }

  return {
    ok: false as const,
    error:
      "Impossible de creer le profil automatiquement (pseudo deja utilise). Contactez un administrateur.",
  }
}

export async function getCurrentMember(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data: member, error } = await supabase
    .from("members")
    .select("status, role")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const, member }
}

export async function getAccessType(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("app_config")
    .select("access_type")
    .eq("id", APP_CONFIG_SINGLETON_ID)
    .maybeSingle()

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return {
    ok: true as const,
    accessType: data?.access_type ?? "open",
  }
}

type EmailRegistrationCheckResult =
  | { ok: true; exists: boolean }
  | { ok: false; error: string }

export async function isEmailAlreadyRegistered(
  email: string
): Promise<EmailRegistrationCheckResult> {
  const normalizedEmail = normalizeString(email).toLowerCase()
  if (!normalizedEmail) {
    return { ok: true, exists: false }
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY manquant: verification d'unicite email indisponible.",
    }
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
    const match = users.some(
      (candidate) => (candidate.email ?? "").toLowerCase() === normalizedEmail
    )

    if (match) {
      return { ok: true, exists: true }
    }

    if (users.length < perPage) {
      break
    }
  }

  return { ok: true, exists: false }
}

export function mapAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized === "{}" || normalized === "[object object]") {
    return "Le service d'authentification est temporairement indisponible. Reessayez dans quelques instants."
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect."
  }

  if (normalized.includes("email not confirmed")) {
    return "Veuillez verifier votre email avant de vous connecter."
  }

  if (normalized.includes("user already registered")) {
    return "Un compte existe deja avec cet email."
  }

  if (normalized.includes("password should be at least")) {
    return "Le mot de passe ne respecte pas les criteres de securite."
  }

  return message
}
