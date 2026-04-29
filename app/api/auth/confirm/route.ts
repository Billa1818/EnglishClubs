import { NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { syncProfileFromUserMetadata } from "@/lib/auth/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

type ConfirmPayload = {
  code?: string
  tokenHash?: string
  type?: string
  next?: string
}

async function confirmSession(payload: ConfirmPayload) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, reason: "supabase_not_configured" }
  }

  if (!payload.code && !(payload.tokenHash && payload.type)) {
    return { ok: false as const, reason: "missing_token" }
  }

  const supabase = await createServerSupabaseClient()

  if (payload.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(payload.code)
    if (error) {
      return { ok: false as const, reason: "invalid_or_expired" }
    }
  } else {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: payload.tokenHash!,
      type: payload.type as EmailOtpType,
    })

    if (error) {
      return { ok: false as const, reason: "invalid_or_expired" }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, reason: "session_not_found" }
  }

  if (payload.type !== "recovery") {
    const syncResult = await syncProfileFromUserMetadata(supabase, user)
    if (!syncResult.ok) {
      return { ok: false as const, reason: "profile_sync_failed" }
    }
  }

  const redirectTo =
    payload.type === "recovery"
      ? "/reset-password"
      : payload.next?.startsWith("/")
      ? payload.next
      : "/pending"

  return {
    ok: true as const,
    redirectTo,
  }
}

function buildErrorRedirect(request: NextRequest, reason: string) {
  const url = new URL("/confirm", request.url)
  url.searchParams.set("error", reason)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const payload: ConfirmPayload = {
    code: searchParams.get("code") ?? undefined,
    tokenHash: searchParams.get("token_hash") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    next: searchParams.get("next") ?? undefined,
  }

  const result = await confirmSession(payload)

  if (!result.ok) {
    return buildErrorRedirect(request, result.reason)
  }

  return NextResponse.redirect(new URL(result.redirectTo, request.url))
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ConfirmPayload

    const result = await confirmSession(body)

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.reason,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      redirectTo: result.redirectTo,
    })
  } catch (error) {
    console.error("Erreur confirm:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
