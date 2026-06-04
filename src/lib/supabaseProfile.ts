import { supabase, supabaseConfigured } from "./supabase/client"
import { saveCurrentUser, type UserProfile } from "../data/feedbackStore"

export async function syncProfileToStorage() {
  if (!supabase || !supabaseConfigured) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const meta = user.user_metadata || {}
  const profile: UserProfile = {
    uid: user.id,
    name: meta.name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    role: meta.role || "client",
    username: meta.username || undefined,
    company: meta.company || undefined,
    country: meta.country || undefined,
    photoUrl: meta.avatar_url || meta.photoUrl || undefined,
    phone: meta.phone || undefined,
    countryCode: meta.countryCode || undefined,
  }
  saveCurrentUser(profile)
  return profile
}

export async function updateProfileMetadata(updates: Record<string, unknown>) {
  if (!supabase || !supabaseConfigured) return
  await supabase.auth.updateUser({ data: updates })
  await syncProfileToStorage()
}

export async function upsertPublicUser(profile: UserProfile) {
  if (!supabase || !supabaseConfigured) return
  try {
    await supabase.from("users").upsert(
      {
        id: profile.uid,
        name: profile.name,
        email: profile.email,
        username: profile.username || null,
        role: profile.role,
        company: profile.company || null,
        country: profile.country || null,
        photo_url: profile.photoUrl || null,
        phone: profile.phone || null,
        country_code: profile.countryCode || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
  } catch {
    // Table may not exist yet — silently fail
  }
}

export async function checkUsernameAvailabilitySupabase(username: string, currentUid?: string) {
  if (!supabase || !supabaseConfigured) {
    return { available: false, message: "Supabase not configured", username }
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (error) throw error
    const available = !data || data.id === currentUid
    return { available, message: available ? "Username available" : "Username already taken", username }
  } catch {
    return { available: true, message: "Username available", username }
  }
}
