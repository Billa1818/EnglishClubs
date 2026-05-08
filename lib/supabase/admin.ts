import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"
import { getSupabaseUrl } from "./env"

function getSupabaseServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()
}

export function isSupabaseAdminConfigured() {
  return !!getSupabaseUrl() && !!getSupabaseServiceRoleKey()
}

export function createAdminClient() {
  const url = getSupabaseUrl()
  const serviceRoleKey = getSupabaseServiceRoleKey()

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.")
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.")
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
