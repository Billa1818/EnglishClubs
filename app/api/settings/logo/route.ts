import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin"
import { getCurrentMember } from "@/lib/auth/server"

const APP_CONFIG_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
const LOGO_BUCKET = "app-assets"
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]

function isActiveAdmin(
  member: { status: string; role: string } | null | undefined
) {
  return member?.status === "active" && member.role === "admin"
}

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
}

function mapLogoError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("app_config")) {
    return "La table `app_config` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("column") && lower.includes("app_logo_url")) {
    return "La colonne `app_logo_url` est absente. Execute `039_add_app_logo_url.sql` puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (lower.includes("bucket not found")) {
    return "Le bucket `app-assets` est introuvable. Cree-le dans Supabase Storage (public)."
  }

  if (lower.includes("row-level security")) {
    return "Permissions Storage insuffisantes. Configure les policies du bucket `app-assets`."
  }

  return message
}

function extractBucketPath(publicUrl: string) {
  try {
    const parsed = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`
    const index = parsed.pathname.indexOf(marker)
    if (index === -1) {
      return null
    }

    return decodeURIComponent(parsed.pathname.slice(index + marker.length))
  } catch {
    return null
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
      return NextResponse.json({ error: mapLogoError(memberResult.error) }, { status: 500 })
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("logo") ?? formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier logo n'a ete fourni." },
        { status: 400 }
      )
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format invalide. Utilise JPG, PNG, WEBP ou SVG." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Logo trop lourd. Taille maximale: 2 MB." },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || "png"
    const safeName = sanitizeFilename(file.name)
    const filePath = `branding/logo-${Date.now()}-${safeName || `app-logo.${ext}`}`

    const storageClient = isSupabaseAdminConfigured()
      ? createAdminClient()
      : supabase

    if (isSupabaseAdminConfigured()) {
      const { error: bucketCheckError } = await storageClient.storage.getBucket(LOGO_BUCKET)
      if (bucketCheckError?.message.toLowerCase().includes("not found")) {
        await storageClient.storage.createBucket(LOGO_BUCKET, {
          public: true,
          fileSizeLimit: `${MAX_FILE_SIZE_BYTES}`,
          allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
        })
      }
    }

    const { error: uploadError } = await storageClient.storage
      .from(LOGO_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: mapLogoError(uploadError.message) },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = storageClient.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath)
    const appLogoUrl = publicUrlData.publicUrl

    const { data: previousConfig, error: previousError } = await supabase
      .from("app_config")
      .select("app_logo_url")
      .eq("id", APP_CONFIG_SINGLETON_ID)
      .maybeSingle()

    if (previousError) {
      return NextResponse.json(
        { error: mapLogoError(previousError.message) },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from("app_config")
      .update({ app_logo_url: appLogoUrl })
      .eq("id", APP_CONFIG_SINGLETON_ID)

    if (updateError) {
      return NextResponse.json(
        { error: mapLogoError(updateError.message) },
        { status: 500 }
      )
    }

    const previousPath = previousConfig?.app_logo_url
      ? extractBucketPath(previousConfig.app_logo_url)
      : null

    if (previousPath && previousPath !== filePath) {
      await storageClient.storage.from(LOGO_BUCKET).remove([previousPath]).catch(() => null)
    }

    return NextResponse.json({
      success: true,
      data: {
        appLogoUrl,
        path: filePath,
      },
    })
  } catch (error) {
    console.error("Erreur settings/logo POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE() {
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

    const memberResult = await getCurrentMember(supabase, user.id)
    if (!memberResult.ok) {
      return NextResponse.json({ error: mapLogoError(memberResult.error) }, { status: 500 })
    }

    if (!isActiveAdmin(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const storageClient = isSupabaseAdminConfigured()
      ? createAdminClient()
      : supabase

    const { data: config, error: configError } = await supabase
      .from("app_config")
      .select("app_logo_url")
      .eq("id", APP_CONFIG_SINGLETON_ID)
      .maybeSingle()

    if (configError) {
      return NextResponse.json(
        { error: mapLogoError(configError.message) },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from("app_config")
      .update({ app_logo_url: null })
      .eq("id", APP_CONFIG_SINGLETON_ID)

    if (updateError) {
      return NextResponse.json(
        { error: mapLogoError(updateError.message) },
        { status: 500 }
      )
    }

    const previousPath = config?.app_logo_url
      ? extractBucketPath(config.app_logo_url)
      : null

    if (previousPath) {
      await storageClient.storage.from(LOGO_BUCKET).remove([previousPath]).catch(() => null)
    }

    return NextResponse.json({
      success: true,
      data: {
        appLogoUrl: "",
      },
    })
  } catch (error) {
    console.error("Erreur settings/logo DELETE:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
