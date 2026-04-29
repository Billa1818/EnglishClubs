"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PostgrestError, User as SupabaseUser } from "@supabase/supabase-js"
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
import type { User as AppUser } from "@/lib/types"

type Profile = Tables<"profiles">
type Member = Tables<"members">

type UseAuthState = {
  authUser: SupabaseUser | null
  profile: Profile | null
  member: Member | null
  user: AppUser | null
  authError: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isActive: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

function mapSupabaseReadError(
  source: "profile" | "member",
  error: PostgrestError | null
) {
  if (!error) {
    return null
  }

  const message = error.message.toLowerCase()

  if (message.includes("column profiles.id does not exist")) {
    return "La base Supabase n'est pas initialisee correctement. Le schema `profiles` est incompatible. Relance le reset SQL puis les scripts 001 a 008."
  }

  if (
    message.includes("could not find the table 'public.members' in the schema cache") ||
    message.includes("could not find the table 'members' in the schema cache")
  ) {
    return "La table `members` est introuvable dans Supabase. Execute les scripts SQL de la phase 1 puis `NOTIFY pgrst, 'reload schema';`."
  }

  if (message.includes("schema cache")) {
    return "Supabase n'a pas encore recharge le schema. Execute `NOTIFY pgrst, 'reload schema';` puis reessaie."
  }

  if (source === "profile") {
    return "Impossible de charger le profil utilisateur pour le moment."
  }

  return "Impossible de charger les informations d'adhesion pour le moment."
}

function getStringFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key]
  return typeof value === "string" ? value : ""
}

function mapToAppUser(
  authUser: SupabaseUser,
  profile: Profile | null,
  member: Member | null
): AppUser {
  const metadata = authUser.user_metadata
  const email = authUser.email ?? ""
  const defaultPseudo = email.split("@")[0] || `member-${authUser.id.slice(0, 8)}`

  const firstName = profile?.first_name || getStringFromMetadata(metadata, "first_name") || "Membre"
  const lastName = profile?.last_name || getStringFromMetadata(metadata, "last_name") || "English Club"
  const pseudo = profile?.pseudo || getStringFromMetadata(metadata, "pseudo") || defaultPseudo

  const levelFromMetadata = getStringFromMetadata(metadata, "english_level")
  const englishLevel: AppUser["englishLevel"] =
    profile?.english_level ||
    (levelFromMetadata === "intermediate" || levelFromMetadata === "advanced"
      ? levelFromMetadata
      : "beginner")

  return {
    id: authUser.id,
    email,
    firstName,
    lastName,
    pseudo,
    photoUrl: profile?.photo_url ?? undefined,
    englishLevel,
    role: member?.role ?? "member",
  }
}

export function useSupabaseAuth(): UseAuthState {
  const hasSupabaseEnv =
    typeof window !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

  const supabase = useMemo(() => {
    if (!hasSupabaseEnv) {
      return null
    }

    return createBrowserSupabaseClient()
  }, [hasSupabaseEnv])

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastLoggedErrorRef = useRef<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setAuthUser(null)
      setProfile(null)
      setMember(null)
      setAuthError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setAuthUser(null)
      setProfile(null)
      setMember(null)
      setAuthError(null)
      setIsLoading(false)
      return
    }

    const [profileResult, memberResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, pseudo, photo_url, english_level, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("members")
        .select("id, user_id, status, role, joined_at, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ])

    const profileErrorMessage = mapSupabaseReadError("profile", profileResult.error)
    const memberErrorMessage = mapSupabaseReadError("member", memberResult.error)

    const finalErrorMessage = profileErrorMessage ?? memberErrorMessage
    setAuthError(finalErrorMessage)

    if (finalErrorMessage) {
      if (finalErrorMessage !== lastLoggedErrorRef.current) {
        console.warn("Erreur chargement profil/membre:", finalErrorMessage)
        lastLoggedErrorRef.current = finalErrorMessage
      }
    } else {
      lastLoggedErrorRef.current = null
    }

    setAuthUser(user)
    setProfile(profileResult.data ?? null)
    setMember(memberResult.data ?? null)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      await refreshProfile()
      if (!isMounted) {
        return
      }
    }

    void bootstrap()

    if (!supabase) {
      return () => {
        isMounted = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, refreshProfile])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    setAuthUser(null)
    setProfile(null)
    setMember(null)
    setAuthError(null)
  }, [supabase])

  const user = authUser ? mapToAppUser(authUser, profile, member) : null

  return {
    authUser,
    profile,
    member,
    user,
    authError,
    isLoading,
    isAuthenticated: !!authUser,
    isAdmin: member?.role === "admin" && member.status === "active",
    isActive: member?.status === "active",
    signOut,
    refreshProfile,
  }
}
