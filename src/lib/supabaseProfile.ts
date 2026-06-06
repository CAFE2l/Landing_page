import { supabase, supabaseConfigured } from "./supabase/client";
import { saveCurrentUser, type UserProfile } from "../data/feedbackStore";
import { isAdminEmail } from "./adminUsers";
import type { User } from "@supabase/supabase-js";

function profileFromRow(user: User, row: Record<string, unknown>): UserProfile {
  const role =
    user.app_metadata?.role === "admin" ||
    row.role === "admin" ||
    isAdminEmail(user.email)
      ? "admin"
      : "client";

  const fullName = (row.full_name as string) || null;
  const username = (row.username as string) || null;
  const emailPrefix = (row.email as string)?.split("@")[0] || user.email?.split("@")[0] || null;
  const name = fullName || username || emailPrefix || "Unknown user";
  const avatarUrl = (row.avatar_url as string) || null;

  return {
    uid: user.id,
    name,
    fullName: fullName || undefined,
    avatarUrl: avatarUrl || undefined,
    email: (row.email as string) || user.email || "",
    role,
    username: username || undefined,
    company: (row.company as string) || undefined,
    country: (row.location_country as string) || undefined,
    photoUrl: avatarUrl || undefined,
    phone: (row.phone as string) || user.user_metadata?.phone || undefined,
    countryCode: (row.country_code as string) || user.user_metadata?.countryCode || undefined,
    location: (row.location_country as string) || undefined,
    locationCountryCode: (row.location_country_code as string) || undefined,
    bio: (row.bio as string) || undefined,
  };
}

export async function ensureProfileFromAuthUser(user: User): Promise<UserProfile> {
  if (!supabase || !supabaseConfigured) {
    const emailPrefix = user.email?.split("@")[0] || null;
    return {
      uid: user.id,
      name: emailPrefix || "Unknown user",
      fullName: undefined,
      avatarUrl: undefined,
      email: user.email || "",
      role: isAdminEmail(user.email) ? "admin" : "client",
    };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, role, username, full_name, avatar_url, company, phone, country_code, bio, location_country, location_country_code")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const profile = profileFromRow(user, existing as Record<string, unknown>);
    saveCurrentUser(profile);
    return profile;
  }

  // Fallback: check users table if profile not found in profiles table
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, name, email, username, role, company, country, photo_url, phone, country_code, bio, location_country, location_country_code")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUser) {
    const fallbackProfile = profileFromRow(user, {
      full_name: existingUser.name,
      email: existingUser.email,
      username: existingUser.username,
      role: existingUser.role,
      company: existingUser.company,
      avatar_url: existingUser.photo_url,
      phone: existingUser.phone,
      country_code: existingUser.country_code,
      bio: existingUser.bio,
      location_country: existingUser.location_country,
      location_country_code: existingUser.location_country_code,
    } as Record<string, unknown>);
    saveCurrentUser(fallbackProfile);
    // Sync back to profiles table for consistency
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fallbackProfile.name,
        email: fallbackProfile.email,
        username: fallbackProfile.username || null,
        role: fallbackProfile.role,
        company: fallbackProfile.company || null,
        avatar_url: fallbackProfile.photoUrl || null,
        phone: fallbackProfile.phone || null,
        country_code: fallbackProfile.countryCode || null,
        bio: fallbackProfile.bio || null,
        location_country: fallbackProfile.location || null,
        location_country_code: fallbackProfile.locationCountryCode || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    return fallbackProfile;
  }

  const meta = user.user_metadata || {};
  const emailPrefix = user.email?.split("@")[0] || null;
  const seeded = {
    id: user.id,
    email: user.email || null,
    role: isAdminEmail(user.email) ? "admin" : "client",
    full_name:
      meta.name ||
      meta.full_name ||
      meta.display_name ||
      emailPrefix ||
      null,
    avatar_url: meta.avatar_url || meta.picture || meta.photoUrl || null,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("profiles").insert(seeded);
  const profile = profileFromRow(user, seeded);
  saveCurrentUser(profile);
  return profile;
}

export async function syncProfileToStorage() {
  if (!supabase || !supabaseConfigured) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return ensureProfileFromAuthUser(user);
}

export async function updateProfileMetadata(updates: Record<string, unknown>) {
  if (!supabase || !supabaseConfigured) return
  await supabase.auth.updateUser({ data: updates })
}

export async function upsertPublicUser(profile: UserProfile) {
  if (!supabase || !supabaseConfigured) return;
  const displayName = profile.fullName || profile.name || "Unknown user";
  const avatar = profile.avatarUrl || profile.photoUrl || null;
  try {
    await supabase.from("users").upsert(
      {
        id: profile.uid,
        name: displayName,
        email: profile.email,
        username: profile.username || null,
        role: profile.role,
        company: profile.company || null,
        country: profile.country || null,
        photo_url: avatar,
        phone: profile.phone || null,
        country_code: profile.countryCode || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profile.uid)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({
          id: profile.uid,
          full_name: displayName,
          username: profile.username || null,
          email: profile.email || null,
          role: profile.role || "client",
          company: profile.company || null,
          phone: profile.phone || null,
          country_code: profile.countryCode || null,
          avatar_url: avatar,
          bio: profile.bio || null,
          location_country: profile.location || profile.country || null,
          location_country_code: profile.locationCountryCode || null,
          updated_at: new Date().toISOString(),
        });
    }
    await syncFeedbackAuthor(profile);
  } catch {
    // Table may not exist yet — silently fail
  }
}

export async function updatePublicProfile(profile: UserProfile) {
  if (!supabase || !supabaseConfigured || !profile.uid) return;
  const displayName = profile.fullName || profile.name || "Unknown user";
  const avatar = profile.avatarUrl || profile.photoUrl || null;
  await supabase
    .from("profiles")
    .update({
      full_name: displayName,
      username: profile.username || null,
      email: profile.email || null,
      role: profile.role || "client",
      company: profile.company || null,
      phone: profile.phone || null,
      country_code: profile.countryCode || null,
      avatar_url: avatar,
      bio: profile.bio || null,
      location_country: profile.location || profile.country || null,
      location_country_code: profile.locationCountryCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.uid);
  saveCurrentUser(profile);
  await syncFeedbackAuthor(profile);
}

export async function syncFeedbackAuthor(profile: UserProfile) {
  if (!supabase || !supabaseConfigured || !profile.uid) return;
  const displayName = profile.fullName || profile.name || "Unknown user";
  const avatar = profile.avatarUrl || profile.photoUrl || null;
  try {
    await supabase
      .from("feedback_posts")
      .update({
        user_name: displayName,
        user_avatar: avatar || "",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profile.uid);

    await supabase
      .from("feedback_comments")
      .update({
        user_name: displayName,
        user_avatar: avatar || "",
      })
      .eq("user_id", profile.uid);
  } catch {
    // Feedback tables may not be available in every environment.
  }
}

export async function checkUsernameAvailabilitySupabase(
  username: string,
  currentUid?: string,
) {
  if (!supabase || !supabaseConfigured) {
    return { available: false, message: "Supabase not configured", username };
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;
    const available = !data || data.id === currentUid;
    return {
      available,
      message: available ? "Username available" : "Username already taken",
      username,
    };
  } catch {
    return { available: true, message: "Username available", username };
  }
}
