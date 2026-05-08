import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { loginSchema } from "@/lib/validations/auth"
import {
  getCurrentMember,
  mapAuthError,
  reconcileMemberAccessForUser,
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
    const validation = loginSchema.safeParse(body)

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

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      })

    if (signInError) {
      return NextResponse.json(
        { error: mapAuthError(signInError.message) },
        { status: 400 }
      )
    }

    if (!signInData.user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 401 }
      )
    }

    const syncResult = await syncProfileFromUserMetadata(supabase, signInData.user)
    if (!syncResult.ok) {
      return NextResponse.json({ error: syncResult.error }, { status: 500 })
    }

    const reconcileResult = await reconcileMemberAccessForUser(signInData.user)
    if (!reconcileResult.ok) {
      console.warn("Reconcile member access login:", reconcileResult.error)
    }
    const reconciledMember = reconcileResult.ok ? reconcileResult.member : null

    const memberResult = await getCurrentMember(supabase, signInData.user.id)
    if (!memberResult.ok) {
      return NextResponse.json({ error: memberResult.error }, { status: 500 })
    }

    const memberStatus =
      memberResult.member?.status ?? reconciledMember?.status ?? "pending"
    const role = memberResult.member?.role ?? reconciledMember?.role ?? "member"

    let redirectTo = "/pending"
    if (memberStatus === "active") {
      redirectTo = role === "admin" ? "/dashboard" : "/member"
    }

    return NextResponse.json({
      success: true,
      memberStatus,
      role,
      redirectTo,
    })
  } catch (error) {
    console.error("Erreur login:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
