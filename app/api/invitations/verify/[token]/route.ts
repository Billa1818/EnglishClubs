import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase n'est pas configure. Completez votre fichier .env." },
        { status: 503 }
      )
    }

    const { token } = await context.params
    const email = request.nextUrl.searchParams.get("email")

    if (!token || !isUuid(token)) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Token d'invitation invalide.",
        },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.rpc("verify_invitation_token", {
      p_token: token,
      p_email: email ?? undefined,
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes("verify_invitation_token")) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            error:
              "La verification d'invitation n'est pas configuree. Execute les scripts SQL de la phase 3.",
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    const invitation = Array.isArray(data) ? data[0] : null

    return NextResponse.json({
      success: true,
      valid: !!invitation,
      data: invitation ?? null,
    })
  } catch (error) {
    console.error("Erreur invitations verify:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
