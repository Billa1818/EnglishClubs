import { NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { mapAuthError } from "@/lib/auth/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { resetPasswordSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

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

    if (validation.data.code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        validation.data.code
      )

      if (exchangeError) {
        return NextResponse.json(
          { error: "Le lien de reinitialisation est invalide ou expire." },
          { status: 400 }
        )
      }
    } else if (validation.data.tokenHash && validation.data.type) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: validation.data.tokenHash,
        type: validation.data.type as EmailOtpType,
      })

      if (otpError) {
        return NextResponse.json(
          { error: "Le lien de reinitialisation est invalide ou expire." },
          { status: 400 }
        )
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Session invalide. Ouvrez a nouveau le lien de reinitialisation depuis votre email.",
        },
        { status: 401 }
      )
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: validation.data.password,
    })

    if (updateError) {
      return NextResponse.json(
        { error: mapAuthError(updateError.message) },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a ete mis a jour.",
    })
  } catch (error) {
    console.error("Erreur reset-password:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
