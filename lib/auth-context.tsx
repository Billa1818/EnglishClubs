"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { User } from "./types"
import { authUsers } from "./mock-data"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("englishclub_user")
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
      } catch {
        localStorage.removeItem("englishclub_user")
      }
    }
    setIsLoading(false)
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return

    const isAuthPage = pathname?.startsWith("/login") || 
                       pathname?.startsWith("/register") || 
                       pathname?.startsWith("/forgot-password") ||
                       pathname?.startsWith("/reset-password") ||
                       pathname?.startsWith("/confirm") ||
                       pathname?.startsWith("/pending")

    if (!user && !isAuthPage) {
      router.push("/login")
    }

    if (user && isAuthPage) {
      // Redirect to appropriate dashboard based on role
      if (user.role === "admin") {
        router.push("/dashboard")
      } else {
        router.push("/member")
      }
    }
  }, [user, isLoading, pathname, router])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const foundUser = authUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!foundUser) {
      return { success: false, error: "Email ou mot de passe incorrect." }
    }

    if (!foundUser.isEmailVerified) {
      return { success: false, error: "Veuillez verifier votre email avant de vous connecter." }
    }

    // Create user object without password
    const userWithoutPassword: User = {
      id: foundUser.id,
      email: foundUser.email,
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
      pseudo: foundUser.pseudo,
      photoUrl: foundUser.photoUrl,
      englishLevel: foundUser.englishLevel,
      role: foundUser.role,
    }

    setUser(userWithoutPassword)
    localStorage.setItem("englishclub_user", JSON.stringify(userWithoutPassword))

    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("englishclub_user")
    router.push("/login")
  }

  const isAdmin = user?.role === "admin"

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
