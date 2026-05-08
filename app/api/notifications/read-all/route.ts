import { NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"
import { isActiveMember } from "@/app/api/sessions/_shared"
import { mapNotificationsError } from "../_shared"

export async function POST() {
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
      return NextResponse.json(
        { error: mapNotificationsError(memberResult.error) },
        { status: 500 }
      )
    }

    if (!isActiveMember(memberResult.member)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .select("id")

    if (error) {
      return NextResponse.json(
        { error: mapNotificationsError(error.message) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: data?.length ?? 0,
      },
    })
  } catch (error) {
    console.error("Erreur notifications/read-all POST:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
