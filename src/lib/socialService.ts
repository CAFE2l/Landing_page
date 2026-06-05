import { supabase, supabaseConfigured } from "./supabase/client"
import type { SocialPost, SocialComment } from "../data/feedbackStore"

// ========== Posts ==========

export async function fetchSocialPosts(
  mode: "all" | "following" = "all",
  userId?: string,
): Promise<SocialPost[]> {
  if (!supabase || !supabaseConfigured) return []

  let q = supabase
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (mode === "following" && userId) {
    const { data: follows } = await supabase
      .from("social_follows")
      .select("following_id")
      .eq("follower_id", userId)

    const ids = (follows || []).map((r: Record<string, unknown>) => r.following_id as string)
    if (ids.length > 0) {
      q = q.in("user_id", ids)
    } else {
      return []
    }
  }

  const { data, error } = await q
  if (error || !data) return []

  const posts = (data as Record<string, unknown>[]).map(mapPost)

  const enriched = await enrichPosts(posts, userId)
  return enriched
}

export async function createSocialPost(
  userId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "audio",
): Promise<SocialPost | null> {
  if (!supabase || !supabaseConfigured) return null

  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      user_id: userId,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("createSocialPost failed", error)
    return null
  }

  return mapPost(data as Record<string, unknown>)
}

export async function deleteSocialPost(postId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false
  const { error } = await supabase.from("social_posts").delete().eq("id", postId)
  return !error
}

// ========== Likes ==========

export async function toggleSocialLike(
  postId: string,
  userId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const { data: existing } = await supabase
    .from("social_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("social_post_likes")
      .delete()
      .eq("id", (existing as { id: string }).id)
    return !error
  }

  const { error } = await supabase
    .from("social_post_likes")
    .insert({ post_id: postId, user_id: userId })

  return !error
}

export async function fetchUserLikes(
  postIds: string[],
  userId: string,
): Promise<Set<string>> {
  const result = new Set<string>()
  if (!supabase || !supabaseConfigured || postIds.length === 0 || !userId) return result

  const { data } = await supabase
    .from("social_post_likes")
    .select("post_id")
    .in("post_id", postIds)
    .eq("user_id", userId)

  if (data) {
    for (const row of data as { post_id: string }[]) {
      result.add(row.post_id)
    }
  }
  return result
}

// ========== Comments ==========

export async function fetchPostComments(postId: string): Promise<SocialComment[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data } = await supabase
    .from("social_post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })

  if (!data) return []

  const comments = (data as Record<string, unknown>[]).map(mapComment)
  return enrichCommentAuthors(comments)
}

export async function addPostComment(
  postId: string,
  userId: string,
  content: string,
): Promise<SocialComment | null> {
  if (!supabase || !supabaseConfigured) return null

  const { data, error } = await supabase
    .from("social_post_comments")
    .insert({ post_id: postId, user_id: userId, content })
    .select()
    .single()

  if (error || !data) return null
  return mapComment(data as Record<string, unknown>)
}

export async function deletePostComment(commentId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false
  const { error } = await supabase.from("social_post_comments").delete().eq("id", commentId)
  return !error
}

// ========== Follows ==========

export async function toggleFollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured || followerId === followingId) return false

  const { data: existing } = await supabase
    .from("social_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("social_follows")
      .delete()
      .eq("id", (existing as { id: string }).id)
    return !error ? false : false
  }

  const { error } = await supabase
    .from("social_follows")
    .insert({ follower_id: followerId, following_id: followingId })

  return !error
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false
  const { data } = await supabase
    .from("social_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle()
  return !!data
}

export async function fetchFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  if (!supabase || !supabaseConfigured) return { followers: 0, following: 0 }

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("social_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("social_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ])

  return { followers: followers || 0, following: following || 0 }
}

export async function fetchFollowingIds(userId: string): Promise<Set<string>> {
  const result = new Set<string>()
  if (!supabase || !supabaseConfigured || !userId) return result

  const { data } = await supabase
    .from("social_follows")
    .select("following_id")
    .eq("follower_id", userId)

  if (data) {
    for (const row of data as { following_id: string }[]) {
      result.add(row.following_id)
    }
  }
  return result
}

export async function fetchFollowersList(
  userId: string,
): Promise<Array<{ id: string; name: string; username: string | null; avatarUrl: string | null; bio: string | null }>> {
  if (!supabase || !supabaseConfigured) return []
  const { data } = await supabase
    .from("social_follows")
    .select("follower_id")
    .eq("following_id", userId)

  if (!data) return []
  const followerIds = (data as { follower_id: string }[]).map((r) => r.follower_id)
  if (followerIds.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio")
    .in("id", followerIds)

  if (!profiles) return []
  return (profiles as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: (r.full_name as string) || (r.username as string) || "User",
    username: (r.username as string) || null,
    avatarUrl: (r.avatar_url as string) || null,
    bio: (r.bio as string) || null,
  }))
}

export async function fetchFollowingList(
  userId: string,
): Promise<Array<{ id: string; name: string; username: string | null; avatarUrl: string | null; bio: string | null }>> {
  if (!supabase || !supabaseConfigured) return []
  const { data } = await supabase
    .from("social_follows")
    .select("following_id")
    .eq("follower_id", userId)

  if (!data) return []
  const followingIds = (data as { following_id: string }[]).map((r) => r.following_id)
  if (followingIds.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio")
    .in("id", followingIds)

  if (!profiles) return []
  return (profiles as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: (r.full_name as string) || (r.username as string) || "User",
    username: (r.username as string) || null,
    avatarUrl: (r.avatar_url as string) || null,
    bio: (r.bio as string) || null,
  }))
}

// ========== Helpers ==========

function mapPost(row: Record<string, unknown>): SocialPost {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    content: row.content as string,
    mediaUrl: (row.media_url as string) || null,
    mediaType: (row.media_type as "image" | "video" | "audio") || null,
    likesCount: (row.likes_count as number) || 0,
    commentsCount: (row.comments_count as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || row.created_at as string,
    user: null,
    liked: false,
    comments: [],
  }
}

function mapComment(row: Record<string, unknown>): SocialComment {
  return {
    id: row.id as string,
    postId: row.post_id as string,
    userId: row.user_id as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    user: null,
  }
}

async function enrichPosts(
  posts: SocialPost[],
  currentUserId?: string,
): Promise<SocialPost[]> {
  const userIds = [...new Set(posts.map((p) => p.userId))]
  const postIds = posts.map((p) => p.id)

  const [profileMap, likedSet] = await Promise.all([
    fetchProfiles(userIds),
    currentUserId ? fetchUserLikes(postIds, currentUserId) : Promise.resolve(new Set<string>()),
  ])

  return posts.map((post) => ({
    ...post,
    user: profileMap.get(post.userId) || null,
    liked: likedSet.has(post.id),
  }))
}

async function enrichCommentAuthors(comments: SocialComment[]): Promise<SocialComment[]> {
  const userIds = [...new Set(comments.map((c) => c.userId))]
  const profileMap = await fetchProfiles(userIds)

  return comments.map((comment) => ({
    ...comment,
    user: profileMap.get(comment.userId) || null,
  }))
}

async function fetchProfiles(
  userIds: string[],
): Promise<Map<string, { id: string; name: string; avatarUrl: string | null; username: string | null }>> {
  const map = new Map()
  if (!supabase || !supabaseConfigured || userIds.length === 0) return map

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds)

  if (data) {
    for (const row of data as Record<string, unknown>[]) {
      map.set(row.id as string, {
        id: row.id as string,
        name: (row.full_name as string) || (row.username as string) || "User",
        avatarUrl: (row.avatar_url as string) || null,
        username: (row.username as string) || null,
      })
    }
  }
  return map
}
