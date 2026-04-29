export function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim()
}

export function isSupabaseConfigured() {
  return !!getSupabaseUrl() && !!getSupabasePublishableKey()
}
