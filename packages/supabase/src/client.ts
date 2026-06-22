import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types"

let client: SupabaseClient<Database> | null = null

export type SupabaseConfig = {
  url: string
  anonKey: string
}

export function initSupabase(config: SupabaseConfig): SupabaseClient<Database> {
  if (client) return client
  client = createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: typeof globalThis?.localStorage !== "undefined" ? globalThis.localStorage : undefined,
    },
  })
  return client
}

export function getClient(): SupabaseClient<Database> {
  if (!client) throw new Error("Supabase not initialized. Call initSupabase() first.")
  return client
}
