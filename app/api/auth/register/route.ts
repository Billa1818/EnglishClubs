import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { registerSchema } from "@/lib/validations/auth"
import {
  buildAuthRedirectUrl,
  getAccessType,
  getCurrentMember,
  mapAuthError,
  syncProfileFromUserMetadata,
} from "@/lib/auth/server"

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const validation = registerSchema.safeParse(body)

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

    const accessTypeResult = await getAccessType(supabase)
    if (!accessTypeResult.ok) {
      return NextResponse.json(
        { error: "Impossible de verifier la configuration de l'application." },
        { status: 500 }
      )
    }

    if (
      accessTypeResult.accessType === "invitation" &&
      !validation.data.invitationToken
    ) {
      return NextResponse.json(
        {
          error:
            "Une invitation est requise pour creer un compte sur cette plateforme.",
        },
        { status: 403 }
      )
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(request.url, "/confirm"),
        data: {
          first_name: validation.data.firstName,
          last_name: validation.data.lastName,
          pseudo: validation.data.pseudo,
          english_level: validation.data.englishLevel,
          invitation_token: validation.data.invitationToken ?? null,
        },
      },
    })

    if (signUpError) {
      return NextResponse.json(
        { error: mapAuthError(signUpError.message) },
        { status: 400 }
      )
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { error: "Impossible de creer le compte." },
        { status: 500 }
      )
    }

    let memberStatus: "pending" | "active" | "suspended" | "removed" | null = null
    let role: "admin" | "member" | null = null

    if (signUpData.session) {
      const syncResult = await syncProfileFromUserMetadata(supabase, signUpData.user)
      if (!syncResult.ok) {
        return NextResponse.json({ error: syncResult.error }, { status: 500 })
      }

      const memberResult = await getCurrentMember(supabase, signUpData.user.id)
      if (!memberResult.ok) {
        return NextResponse.json({ error: memberResult.error }, { status: 500 })
      }

      memberStatus = memberResult.member?.status ?? "pending"
      role = memberResult.member?.role ?? "member"
    }

    return NextResponse.json(
      {
        success: true,
        requiresEmailConfirmation: !signUpData.session,
        memberStatus,
        role,
        message: !signUpData.session
          ? "Inscription reussie. Verifiez votre email pour activer le compte."
          : "Inscription reussie.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur register:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
