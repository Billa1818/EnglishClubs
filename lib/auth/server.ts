import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "@/lib/supabase/types"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"

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

export function mapAuthError(message: string) {
  const normalized = message.toLowerCase()

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
