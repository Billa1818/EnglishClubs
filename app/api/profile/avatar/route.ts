import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const AVATAR_BUCKET = "avatars"

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
}

function mapAvatarUploadError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("bucket not found")) {
    return "Le bucket de stockage `avatars` est introuvable. Cree-le dans Supabase Storage."
  }

  if (lower.includes("row-level security")) {
    return "Permissions de stockage insuffisantes. Configure les policies du bucket `avatars`."
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

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
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
        { error: "Image trop lourde. Taille maximale: 2 MB." },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || "jpg"
    const safeName = sanitizeFilename(file.name)
    const filePath = `${user.id}/${Date.now()}-${safeName || `avatar.${ext}`}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: mapAvatarUploadError(uploadError.message) },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath)

    const photoUrl = publicUrlData.publicUrl

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ photo_url: photoUrl })
      .eq("id", user.id)

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "Image envoyee, mais mise a jour du profil impossible. Verifie la table `profiles`.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        photoUrl,
        path: filePath,
      },
    })
  } catch (error) {
    console.error("Erreur avatar upload:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
