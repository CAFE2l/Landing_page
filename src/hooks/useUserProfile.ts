import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { getInitials } from "../lib/utils";

export interface UserProfileData {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  followers_count: number;
  following_count: number;
  initials: string;
}

export function useUserProfile(userId?: string) {
  const { user: authUser } = useAuth();
  const targetUserId = userId || authUser?.id;

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!targetUserId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profileRes, followersRes, followingRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, email, avatar_url, role, bio")
          .eq("id", targetUserId)
          .maybeSingle(),
        supabase
          .from("social_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", targetUserId),
        supabase
          .from("social_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", targetUserId),
      ]);

      if (profileRes.error) throw profileRes.error;
      const profiles = profileRes.data;

      // Priority for name: profiles.full_name > profiles.username > auth.user_metadata.full_name/name > email prefix
      let displayName = "User";
      if (profiles?.full_name) {
        displayName = profiles.full_name;
      } else if (profiles?.username) {
        displayName = profiles.username;
      } else if (authUser?.id === targetUserId) {
        const meta = authUser.user_metadata || {};
        displayName =
          meta.full_name ||
          meta.name ||
          authUser.email?.split("@")[0] ||
          "User";
      } else if (profiles?.email) {
        displayName = profiles.email.split("@")[0];
      }

      // Priority for avatar: profiles.avatar_url > auth.user_metadata.avatar_url > initials
      let avatarUrl = null;
      if (profiles?.avatar_url) {
        avatarUrl = profiles.avatar_url;
      } else if (authUser?.id === targetUserId) {
        avatarUrl =
          authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          null;
      }

      setProfile({
        id: targetUserId,
        full_name: displayName,
        username: profiles?.username || null,
        email: profiles?.email || authUser?.email || "",
        avatar_url: avatarUrl,
        role: profiles?.role || "client",
        bio: profiles?.bio || null,
        followers_count: followersRes.count || 0,
        following_count: followingRes.count || 0,
        initials: getInitials(displayName),
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [targetUserId, authUser]);

  useEffect(() => {
    fetchProfile();

    if (!targetUserId || !supabase) return;

    const channel = supabase
      .channel(`profile-updates-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${targetUserId}`,
        },
        () => {
          fetchProfile();
        },
      )
      .subscribe();

    const handleUpdate = () => fetchProfile();
    window.addEventListener("cafe-profile-updated", handleUpdate);

    return () => {
      if (supabase) supabase.removeChannel(channel);
      window.removeEventListener("cafe-profile-updated", handleUpdate);
    };
  }, [targetUserId, fetchProfile]);

  return { profile, loading, error, refresh: fetchProfile };
}
