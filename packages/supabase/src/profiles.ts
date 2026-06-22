import { getClient } from "./client"
import type { Database } from "./types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export async function getProfile(userId: string): Promise<Profile | null> {
  const client = getClient()
  const { data } = await client.from("profiles").select("*").eq("id", userId).single()
  return data
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
  const client = getClient()
  const { data, error } = await client.from("profiles").upsert(profile as any).select().single()
  if (error) throw error
  return data as Profile
}
