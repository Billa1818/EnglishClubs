import { redirect } from "next/navigation"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { getCurrentMember } from "@/lib/auth/server"

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/login")
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const memberResult = await getCurrentMember(supabase, user.id)

  if (!memberResult.ok) {
    redirect("/pending")
  }

  const member = memberResult.member

  if (member?.status === "active") {
    redirect(member.role === "admin" ? "/dashboard" : "/member")
  }

  redirect("/pending")
}
