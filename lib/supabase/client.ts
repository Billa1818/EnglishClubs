import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"
import { getSupabasePublishableKey, getSupabaseUrl } from "./env"

export function createClient() {
  const url = getSupabaseUrl()
  const publishableKey = getSupabasePublishableKey()

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.")
  }

  if (!publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    )
  }

  return createBrowserClient<Database>(
    url,
    publishableKey
  )
}
