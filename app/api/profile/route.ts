import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { profileUpdateSchema } from "@/lib/validations/phase3"
import { getCurrentMember } from "@/lib/auth/server"

function mapProfileError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("relation") && lower.includes("profiles")) {
    return "La table `profiles` est absente. Execute les scripts SQL de la phase 1."
  }

  if (lower.includes("duplicate key value") || lower.includes("unique constraint")) {
    return "Ce pseudo est deja utilise. Choisissez-en un autre."
  }

  return message
}

export async function GET() {
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

    const [profileResult, memberResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, pseudo, photo_url, english_level, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle(),
      getCurrentMember(supabase, user.id),
    ])

    if (profileResult.error) {
      return NextResponse.json(
        { error: mapProfileError(profileResult.error.message) },
        { status: 500 }
      )
    }

    if (!memberResult.ok) {
      return NextResponse.json(
        { error: mapProfileError(memberResult.error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: profileResult.data ?? null,
        member: memberResult.member ?? null,
        auth: {
          email: user.email ?? null,
          emailConfirmedAt: user.email_confirmed_at ?? null,
        },
      },
    })
  } catch (error) {
    console.error("Erreur profile GET:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = profileUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Donnees invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        { error: "Aucune modification detectee." },
        { status: 400 }
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

    const updates: {
      first_name?: string
      last_name?: string
      pseudo?: string
      english_level?: "beginner" | "intermediate" | "advanced"
    } = {}

    if (validation.data.firstName) {
      updates.first_name = validation.data.firstName
    }

    if (validation.data.lastName) {
      updates.last_name = validation.data.lastName
    }

    if (validation.data.pseudo) {
      updates.pseudo = validation.data.pseudo
    }

    if (validation.data.englishLevel) {
      updates.english_level = validation.data.englishLevel
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id, first_name, last_name, pseudo, photo_url, english_level, created_at, updated_at")
      .single()

    if (error) {
      return NextResponse.json(
        { error: mapProfileError(error.message) },
        { status: 500 }
      )
    }

    const metadataPatch: Record<string, string> = {}
    if (validation.data.firstName) metadataPatch.first_name = validation.data.firstName
    if (validation.data.lastName) metadataPatch.last_name = validation.data.lastName
    if (validation.data.pseudo) metadataPatch.pseudo = validation.data.pseudo
    if (validation.data.englishLevel) metadataPatch.english_level = validation.data.englishLevel

    if (Object.keys(metadataPatch).length > 0) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: metadataPatch,
      })

      if (metadataError) {
        return NextResponse.json(
          {
            error:
              "Profil mis a jour, mais la synchronisation des metadonnees a echoue. Reessayez.",
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erreur profile PATCH:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
