"use client"

import {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
  useMemo,
} from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/hooks/use-auth"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Tables } from "@/lib/supabase/types"
import type { User } from "./types"

type LoginResult = {
  success: boolean
  error?: string
  redirectTo?: string
}

interface AuthContextType {
  authUser: SupabaseUser | null
  profile: Tables<"profiles"> | null
  member: Tables<"members"> | null
  user: User | null
  authError: string | null
  isLoading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
  isActive: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const {
    authUser,
    profile,
    member,
    user,
    authError,
    isLoading,
    isAdmin,
    isAuthenticated,
    isActive,
    signOut,
    refreshProfile,
  } = useSupabaseAuth()

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
          redirectTo?: string
        }

        if (!response.ok) {
          return {
            success: false,
            error: payload.error || "Email ou mot de passe incorrect.",
          }
        }

        await refreshProfile()

        return {
          success: true,
          redirectTo: payload.redirectTo,
        }
      } catch {
        return {
          success: false,
          error: "Impossible de contacter le serveur.",
        }
      }
    },
    [refreshProfile]
  )

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
    } catch {
      // No-op
    }

    await signOut()
    router.push("/login")
    router.refresh()
  }, [signOut, router])

  const value = useMemo<AuthContextType>(
    () => ({
      authUser,
      profile,
      member,
      user,
      authError,
      isLoading,
      isAdmin,
      isAuthenticated,
      isActive,
      login,
      logout,
      signOut: logout,
      refreshProfile,
    }),
    [
      authUser,
      profile,
      member,
      user,
      authError,
      isLoading,
      isAdmin,
      isAuthenticated,
      isActive,
      login,
      logout,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
