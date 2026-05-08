import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/types"

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/confirm",
]

// Admin UI routes live at the root level because route groups are not part of URLs.
const ADMIN_ONLY_ROUTES = [
  "/dashboard",
  "/members",
  "/sessions",
  "/attendance",
  "/absences",
  "/activities",
  "/selection",
  "/topics",
  "/freecodecamp",
  "/settings",
  "/notifications",
  "/profile",
]

const MEMBER_ONLY_ROUTES = ["/member"]

// Shared authenticated routes can be added here if needed in the future.
const SHARED_AUTH_ROUTES: string[] = []

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

function matchesAnyRoute(pathname: string, routes: string[]) {
  return routes.some((route) => isRoute(pathname, route))
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = new URL(pathname, request.url)
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const supabaseUrl = getSupabaseUrl()
  const supabasePublishableKey = getSupabasePublishableKey()

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
  })

  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  const isAuthRoute = AUTH_ROUTES.some((route) => isRoute(pathname, route))
  const isAdminRoute = matchesAnyRoute(pathname, ADMIN_ONLY_ROUTES)
  const isMemberRoute = matchesAnyRoute(pathname, MEMBER_ONLY_ROUTES)
  const isSharedAuthRoute = matchesAnyRoute(pathname, SHARED_AUTH_ROUTES)
  const isPendingRoute = isRoute(pathname, "/pending")
  const isInviteRoute = pathname.startsWith("/invite/")
  const isHomeRoute = pathname === "/"
  const isProtectedRoute =
    isAdminRoute || isMemberRoute || isPendingRoute || isSharedAuthRoute

  if (!user) {
    if (isProtectedRoute) {
      return redirectTo(request, "/login")
    }
    return supabaseResponse
  }

  const { data: member } = await supabase
    .from("members")
    .select("status, role")
    .eq("user_id", user.id)
    .maybeSingle()

  if (isPendingRoute) {
    if (member?.status === "active") {
      return redirectTo(request, member.role === "admin" ? "/dashboard" : "/member")
    }
    return supabaseResponse
  }

  if (member?.status !== "active") {
    if (!isAuthRoute) {
      return redirectTo(request, "/pending")
    }
    return supabaseResponse
  }

  if (isAdminRoute && member.role !== "admin") {
    return redirectTo(request, "/member")
  }

  if (isAuthRoute || isHomeRoute || isInviteRoute) {
    return redirectTo(request, member.role === "admin" ? "/dashboard" : "/member")
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
