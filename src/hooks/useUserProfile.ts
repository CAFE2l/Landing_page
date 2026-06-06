import { useState, useEffect, useCallback, useRef, useId } from "react";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { getInitials } from "../lib/utils";
import {
  canQuerySocialFollows,
  markSocialFollowsError,
} from "../lib/socialFollowsHealth";

const FOLLOWS_TABLE = "social_follows";

function countOrZero(result: { count: number | null; error?: unknown }) {
  markSocialFollowsError("count profile follows", result.error);
  return result.count || 0;
}

export interface UserProfileData {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  phone: string | null;
  location: string | null;
  locationCountryCode: string | null;
  followers_count: number;
  following_count: number;
  initials: string;
}

export function useUserProfile(userId?: string) {
  const { user: authUser } = useAuth();
  const targetUserId = userId !== undefined ? (userId || null) : (authUser?.id || null);
  const reactId = useId();
  const channelInstanceId = useRef(reactId.replace(/[^a-zA-Z0-9_-]/g, ""));
  const channelSequence = useRef(0);

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
      const followCounts = canQuerySocialFollows()
        ? [
            supabase
              .from(FOLLOWS_TABLE)
              .select("*", { count: "exact", head: true })
              .eq("following_id", targetUserId),
            supabase
              .from(FOLLOWS_TABLE)
              .select("*", { count: "exact", head: true })
              .eq("follower_id", targetUserId),
          ]
        : [
            Promise.resolve({ count: 0, error: null }),
            Promise.resolve({ count: 0, error: null }),
          ];

      const [profileRes, followersRes, followingRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, email, avatar_url, role, bio, phone, location_country, location_country_code")
          .eq("id", targetUserId)
          .maybeSingle(),
        ...followCounts,
      ]);

      if (profileRes.error) throw profileRes.error;
      const profiles = profileRes.data;

      const emailPrefix = profiles?.email?.split("@")[0] || authUser?.email?.split("@")[0];
      let displayName = emailPrefix || "Unknown user";
      if (profiles?.full_name) {
        displayName = profiles.full_name;
      } else if (profiles?.username) {
        displayName = profiles.username;
      } else if (authUser?.id === targetUserId) {
        const meta = authUser.user_metadata || {};
        displayName =
          meta.full_name ||
          meta.name ||
          meta.display_name ||
          emailPrefix ||
          "Unknown user";
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
        phone: profiles?.phone || null,
        location: profiles?.location_country || null,
        locationCountryCode: profiles?.location_country_code || null,
        followers_count: countOrZero(followersRes),
        following_count: countOrZero(followingRes),
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

    channelSequence.current += 1;
    const channel = supabase
      .channel(
        `profile-updates-${targetUserId}-${channelInstanceId.current}-${channelSequence.current}`,
      )
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
