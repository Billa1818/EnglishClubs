import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export const FCC_BUCKET = "fcc-screenshots"

export const FCC_SELECT =
  "id, user_id, track, level, modules_completed, certificate_name, screenshot_url, validated_by, validated_at, created_at, updated_at, user:profiles!fcc_progressions_user_id_fkey(id, first_name, last_name, pseudo, photo_url, english_level), validator:profiles!fcc_progressions_validated_by_fkey(id, first_name, last_name, pseudo, photo_url, english_level)"

export type FccProfileLite = {
  id: string
  first_name: string
  last_name: string
  pseudo: string
  photo_url: string | null
  english_level: "beginner" | "intermediate" | "advanced"
}

export type FccRow = {
  id: string
  user_id: string
  track: string
  level: "Starting" | "In Progress" | "Almost Done" | "Completed"
  modules_completed: number
  certificate_name: string | null
  screenshot_url: string | null
  validated_by: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
  user: FccProfileLite | null
  validator: FccProfileLite | null
}

export type FccRowWithSignedScreenshot = FccRow & {
  screenshot_signed_url: string | null
}

export function isActiveMember(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active"
}

export function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

export function mapFccError(message: string) {
  const lower = message.toLowerCase()

  if (
    (lower.includes("relation \"public.fcc_progressions\"") &&
      lower.includes("does not exist")) ||
    (lower.includes("could not find the table") && lower.includes("fcc_progressions"))
  ) {
    return "La table `fcc_progressions` est absente. Execute `029_create_fcc_progressions.sql` puis `030_rls_fcc_progressions.sql`."
  }

  if (
    lower.includes("schema cache") &&
    lower.includes("fcc_progressions")
  ) {
    return "Le schema Supabase n'est pas a jour pour la phase 10. Execute `NOTIFY pgrst, 'reload schema';` puis recharge."
  }

  if (
    lower.includes("column") &&
    lower.includes("fcc_progressions")
  ) {
    return "Le schema phase 10 est incomplet. Reexecute `029_create_fcc_progressions.sql` puis `030_rls_fcc_progressions.sql`."
  }

  if (lower.includes("fcc_progressions_unique_member_track")) {
    return "Ce parcours existe deja pour cet utilisateur. Modifie plutot la progression existante."
  }

  if (lower.includes("bucket not found") && lower.includes(FCC_BUCKET)) {
    return "Le bucket `fcc-screenshots` est introuvable. Execute `030_rls_fcc_progressions.sql`."
  }

  if (lower.includes("row-level security")) {
    return "Permissions insuffisantes. Verifie les policies RLS de la phase 10."
  }

  if (
    lower.includes("storage") &&
    (lower.includes("permission denied") || lower.includes("policy"))
  ) {
    return "Les policies Storage du bucket `fcc-screenshots` bloquent l'action. Reexecute `030_rls_fcc_progressions.sql`."
  }

  return message
}

function isExternalUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
}

export async function withSignedScreenshots(
  supabase: SupabaseClient<Database>,
  rows: FccRow[],
  options: {
    viewerId: string
    isAdmin: boolean
    expiresIn?: number
  }
): Promise<FccRowWithSignedScreenshot[]> {
  const expiresIn = options.expiresIn ?? 60 * 60

  return Promise.all(
    rows.map(async (row) => {
      const screenshotPath = row.screenshot_url
      const canReadScreenshot = options.isAdmin || row.user_id === options.viewerId

      if (!screenshotPath || !canReadScreenshot) {
        return {
          ...row,
          screenshot_signed_url: null,
        }
      }

      if (isExternalUrl(screenshotPath)) {
        return {
          ...row,
          screenshot_signed_url: screenshotPath,
        }
      }

      const { data, error } = await supabase.storage
        .from(FCC_BUCKET)
        .createSignedUrl(screenshotPath, expiresIn)

      if (error || !data?.signedUrl) {
        return {
          ...row,
          screenshot_signed_url: null,
        }
      }

      return {
        ...row,
        screenshot_signed_url: data.signedUrl,
      }
    })
  )
}
