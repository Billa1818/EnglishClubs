import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { buildAuthRedirectUrl } from "@/lib/auth/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { forgotPasswordSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)

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

    const { error } = await supabase.auth.resetPasswordForEmail(
      validation.data.email,
      {
        redirectTo: buildAuthRedirectUrl(request.url, "/reset-password"),
      }
    )

    if (error) {
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email de reinitialisation." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message:
        "Si un compte existe avec cette adresse email, un lien de reinitialisation a ete envoye.",
    })
  } catch (error) {
    console.error("Erreur forgot-password:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
