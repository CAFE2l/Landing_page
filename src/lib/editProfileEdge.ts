import { supabase, supabaseConfigured } from "./supabase/client"

export async function editProfileViaEdge(userId: string, updates: {
  avatar_url?: string | null
  full_name?: string
  username?: string | null
  company?: string | null
  phone?: string | null
  bio?: string | null
  location_country?: string | null
  location_country_code?: string | null
}): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const session = await supabase.auth.getSession()
  const token = session?.data?.session?.access_token
  if (!token) return false

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return false

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/edit-profile-v2`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...updates }),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("[editProfileViaEdge] failed:", err)
      return false
    }

    return true
  } catch (err) {
    console.error("[editProfileViaEdge] error:", err)
    return false
  }
}
