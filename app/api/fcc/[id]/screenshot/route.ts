import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import {
  FCC_BUCKET,
  FCC_SELECT,
  type FccRow,
  isActiveAdmin,
  isActiveMember,
  mapFccError,
  withSignedScreenshots,
} from "../../_shared"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
}

function mapUploadError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("bucket not found")) {
    return "Le bucket `fcc-screenshots` est introuvable. Execute `030_rls_fcc_progressions.sql`."
  }

  if (lower.includes("row-level security")) {
    return "Permissions Storage insuffisantes. Verifie les policies du bucket `fcc-screenshots`."
  }

  return mapFccError(message)
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { id } = await context.params
    const progressionId = id?.trim()

    if (!progressionId) {
      return NextResponse.json({ error: "Identifiant progression manquant." }, { status: 400 })
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
      return NextResponse.json({ error: mapFccError(memberResult.error) }, { status: 500 })
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data: existing, error: existingError } = await supabase
      .from("fcc_progressions")
      .select("id, user_id, screenshot_url")
      .eq("id", progressionId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: mapFccError(existingError.message) }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: "Progression introuvable." }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "Tu ne peux envoyer une preuve que pour ta progression." },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier image n'a ete fourni." },
        { status: 400 }
      )
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format invalide. Utilise JPG, PNG ou WEBP." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image trop lourde. Taille maximale: 5 MB." },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || "jpg"
    const safeName = sanitizeFilename(file.name)
    const filePath = `${user.id}/${progressionId}-${Date.now()}-${safeName || `fcc.${ext}`}`

    const { error: uploadError } = await supabase.storage
      .from(FCC_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: mapUploadError(uploadError.message) }, { status: 500 })
    }

    if (
      existing.screenshot_url &&
      !existing.screenshot_url.startsWith("http://") &&
      !existing.screenshot_url.startsWith("https://")
    ) {
      await supabase.storage.from(FCC_BUCKET).remove([existing.screenshot_url]).catch(() => null)
    }

    const { data: updated, error: updateError } = await supabase
      .from("fcc_progressions")
      .update({
        screenshot_url: filePath,
        validated_by: null,
        validated_at: null,
      })
      .eq("id", progressionId)
      .eq("user_id", user.id)
      .select(FCC_SELECT)
      .single()

    if (updateError) {
      return NextResponse.json({ error: mapFccError(updateError.message) }, { status: 500 })
    }

    const [rowWithScreenshot] = await withSignedScreenshots(supabase, [updated as FccRow], {
      viewerId: user.id,
      isAdmin: isActiveAdmin(memberResult.member),
    })

    return NextResponse.json({
      success: true,
      data: rowWithScreenshot,
      message: "Screenshot enregistre avec succes.",
    })
  } catch (error) {
    console.error("Erreur fcc/[id]/screenshot POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
