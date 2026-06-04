import { supabase, supabaseConfigured } from "../lib/supabase/client"
import type {
  FeedbackPost, FeedbackComment, FeedbackAdminReply,
  FeedbackMedia, FeedbackStatus, ServiceCategory,
} from "./feedbackStore"

const POSTS_TABLE = "feedback_posts"
const MEDIA_TABLE = "feedback_media"
const COMMENTS_TABLE = "feedback_comments"
const VOTES_TABLE = "feedback_helpful_votes"

// ========== Mapping helpers ==========

function mapPost(row: Record<string, unknown>): FeedbackPost {
  const adminReplyRaw = row.admin_reply as Record<string, unknown> | null
  const adminReply: FeedbackAdminReply | undefined = adminReplyRaw
    ? {
        content: (adminReplyRaw.content as string) || "",
        adminId: (adminReplyRaw.admin_id as string) || (adminReplyRaw.adminId as string) || "",
        adminName: (adminReplyRaw.admin_name as string) || (adminReplyRaw.adminName as string) || "",
        createdAt: (adminReplyRaw.created_at as string) || (adminReplyRaw.createdAt as string) || "",
      }
    : undefined

  return {
    id: row.id as string,
    userId: (row.user_id as string) || "",
    userName: (row.user_name as string) || "Anonymous",
    userAvatar: (row.user_avatar as string) || "",
    serviceCategory: (row.service_category as ServiceCategory) || "Outro",
    projectTitle: (row.project_title as string) || "",
    projectUrl: (row.project_url as string) || undefined,
    rating: (row.star_rating as number) || 0,
    title: (row.title as string) || "",
    content: (row.body as string) || "",
    media: (row.media as FeedbackMedia[]) || [],
    serviceDate: (row.service_date as string) || undefined,
    status: (row.status as FeedbackStatus) || "pending",
    isVerifiedClient: (row.is_verified_client as boolean) || false,
    isVerifiedProject: (row.is_verified_project as boolean) || false,
    isHighlighted: (row.is_highlighted as boolean) || false,
    helpfulCount: (row.helpful_count as number) || 0,
    commentCount: (row.comment_count as number) || 0,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || (row.created_at as string) || new Date().toISOString(),
    adminReply,
    improvementSuggestion: (row.improvement_suggestion as string) || undefined,
  }
}

function toSnake(data: Partial<FeedbackPost>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.userId !== undefined) out.user_id = data.userId
  if (data.userName !== undefined) out.user_name = data.userName
  if (data.userAvatar !== undefined) out.user_avatar = data.userAvatar
  if (data.serviceCategory !== undefined) out.service_category = data.serviceCategory
  if (data.projectTitle !== undefined) out.project_title = data.projectTitle
  if (data.projectUrl !== undefined) out.project_url = data.projectUrl
  if (data.rating !== undefined) out.star_rating = data.rating
  if (data.title !== undefined) out.title = data.title
  if (data.content !== undefined) out.body = data.content
  if (data.status !== undefined) out.status = data.status
  if (data.serviceDate !== undefined) out.service_date = data.serviceDate
  if (data.isVerifiedClient !== undefined) out.is_verified_client = data.isVerifiedClient
  if (data.isVerifiedProject !== undefined) out.is_verified_project = data.isVerifiedProject
  if (data.isHighlighted !== undefined) out.is_highlighted = data.isHighlighted
  if (data.helpfulCount !== undefined) out.helpful_count = data.helpfulCount
  if (data.commentCount !== undefined) out.comment_count = data.commentCount
  if (data.improvementSuggestion !== undefined) out.improvement_suggestion = data.improvementSuggestion
  if (data.adminReply !== undefined) out.admin_reply = data.adminReply as unknown as Record<string, unknown>
  return out
}

function mapComment(row: Record<string, unknown>): FeedbackComment {
  return {
    id: row.id as string,
    postId: (row.post_id as string) || "",
    userId: (row.user_id as string) || "",
    userName: (row.user_name as string) || "Anonymous",
    userAvatar: (row.user_avatar as string) || "",
    content: (row.body as string) || "",
    status: (row.status as "visible" | "hidden") || "visible",
    createdAt: (row.created_at as string) || new Date().toISOString(),
  }
}

// ========== Posts ==========

export async function fetchFeedbackPosts(limitCount = 50): Promise<FeedbackPost[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`)
    .order("created_at", { ascending: false })
    .limit(limitCount)
  if (error) return []
  return (data || []).map((row: Record<string, unknown>) => {
    const media = (row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || []
    return mapPost({ ...row, media: media.map((m: Record<string, unknown>) => ({
      url: m.url as string,
      type: m.type as "image" | "video",
      altText: (m.alt_text as string) || undefined,
    })) })
  })
}

export async function fetchFeedbackPostById(id: string): Promise<FeedbackPost | null> {
  if (!supabase || !supabaseConfigured) return null
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`)
    .eq("id", id)
    .single()
  if (error || !data) return null
  const media = (data[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || []
  return mapPost({ ...data, media: media.map((m: Record<string, unknown>) => ({
    url: m.url as string,
    type: m.type as "image" | "video",
    altText: (m.alt_text as string) || undefined,
  })) })
}

export async function createFeedbackPost(
  post: Omit<FeedbackPost, "id" | "helpfulCount" | "commentCount" | "createdAt" | "updatedAt">,
): Promise<string | null> {
  if (!supabase || !supabaseConfigured) {
    console.error("createFeedbackPost: Supabase not configured")
    return null
  }
  try {
    const dbData = toSnake(post)
    dbData.helpful_count = 0
    dbData.comment_count = 0
    dbData.status = "pending"
    dbData.created_at = new Date().toISOString()
    dbData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from(POSTS_TABLE)
      .insert(dbData)
      .select("id")
      .single()
    if (error) {
      console.error("createFeedbackPost failed", error)
      return null
    }
    return (data as { id: string }).id
  } catch (e) {
    console.error("createFeedbackPost error", e)
    return null
  }
}

export async function updateFeedbackPost(id: string, updates: Partial<FeedbackPost>): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  const allowedFields = [
    "title", "content", "serviceCategory", "projectTitle", "projectUrl",
    "rating", "status", "isVerifiedClient", "isVerifiedProject",
    "isHighlighted", "improvementSuggestion", "serviceDate",
  ] as (keyof FeedbackPost)[]
  const dbData = toSnake(updates)
  for (const key of Object.keys(dbData)) {
    if (!allowedFields.some((f) => toSnake({ [f]: true } as Partial<FeedbackPost>)[key] !== undefined)) {
      delete dbData[key]
    }
  }
  dbData.updated_at = new Date().toISOString()
  await supabase.from(POSTS_TABLE).update(dbData).eq("id", id)
}

export async function deleteFeedbackPost(id: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase.from(POSTS_TABLE).delete().eq("id", id)
}

// ========== Comments ==========

export async function fetchFeedbackComments(postId: string): Promise<FeedbackComment[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
  if (error) return []
  return (data || []).map(mapComment)
}

export async function addFeedbackComment(
  postId: string,
  comment: Omit<FeedbackComment, "id" | "postId" | "createdAt">,
): Promise<string | null> {
  if (!supabase || !supabaseConfigured) return null
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .insert({
      post_id: postId,
      user_id: comment.userId,
      user_name: comment.userName,
      user_avatar: comment.userAvatar,
      body: comment.content,
      status: comment.status || "visible",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) return null
  const commentId = (data as { id: string }).id
  await supabase.rpc("increment_comment_count", { post_id: postId })
  return commentId
}

export async function deleteFeedbackComment(postId: string, commentId: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase.from(COMMENTS_TABLE).delete().eq("id", commentId).eq("post_id", postId)
  await supabase.rpc("decrement_comment_count", { post_id: postId })
}

export async function updateFeedbackCommentStatus(
  postId: string, commentId: string, status: "visible" | "hidden",
): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase.from(COMMENTS_TABLE).update({ status }).eq("id", commentId).eq("post_id", postId)
}

// ========== Admin Reply ==========

export async function setAdminReply(
  postId: string,
  reply: Omit<FeedbackAdminReply, "createdAt">,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase
    .from(POSTS_TABLE)
    .update({
      admin_reply: { ...reply, createdAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
}

export async function removeAdminReply(postId: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase
    .from(POSTS_TABLE)
    .update({ admin_reply: null, updated_at: new Date().toISOString() })
    .eq("id", postId)
}

// ========== Helpful Votes ==========

export async function toggleHelpfulVote(postId: string, userId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false
  const { data: existing } = await supabase
    .from(VOTES_TABLE)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    await supabase.from(VOTES_TABLE).delete().eq("id", (existing as { id: string }).id)
    await supabase.rpc("decrement_helpful_count", { post_id: postId })
    return false
  }

  await supabase.from(VOTES_TABLE).insert({ post_id: postId, user_id: userId })
  await supabase.rpc("increment_helpful_count", { post_id: postId })
  return true
}

export async function getUserHelpfulVote(postId: string, userId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false
  const { data } = await supabase
    .from(VOTES_TABLE)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}

// ========== Search & Filter ==========

export async function searchFeedbackPosts(
  queryStr: string,
  categoryFilter?: ServiceCategory | "",
  ratingFilter?: number,
  sort: "recent" | "rating" | "helpful" | "media" | "verified" = "recent",
  statusFilter?: FeedbackStatus,
  page = 1,
  pageSize = 20,
): Promise<{ posts: FeedbackPost[]; total: number }> {
  if (!supabase || !supabaseConfigured) return { posts: [], total: 0 }

  let q = supabase.from(POSTS_TABLE).select(`*, ${MEDIA_TABLE}(*)`, { count: "exact" })

  if (statusFilter) {
    q = q.eq("status", statusFilter)
  } else {
    q = q.in("status", ["approved", "highlighted"])
  }

  if (categoryFilter) {
    q = q.eq("service_category", categoryFilter)
  }
  if (ratingFilter && ratingFilter > 0) {
    q = q.gte("star_rating", ratingFilter)
  }

  switch (sort) {
    case "recent":
      q = q.order("created_at", { ascending: false })
      break
    case "rating":
      q = q.order("star_rating", { ascending: false }).order("created_at", { ascending: false })
      break
    case "helpful":
      q = q.order("helpful_count", { ascending: false })
      break
    case "verified":
      q = q.or("is_verified_client.eq.true,is_verified_project.eq.true")
      q = q.order("created_at", { ascending: false })
      break
    case "media":
      q = q.gt("media_count", 0).order("created_at", { ascending: false })
      break
  }

  if (queryStr) {
    const like = `%${queryStr.toLowerCase()}%`
    q = q.or(
      `title.ilike.${like},body.ilike.${like},user_name.ilike.${like},project_title.ilike.${like},service_category.ilike.${like}`
    )
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  q = q.range(from, to)

  const { data, count, error } = await q
  if (error) return { posts: [], total: 0 }

  const posts = (data || []).map((row: Record<string, unknown>) => {
    const media = (row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || []
    return mapPost({ ...row, media: media.map((m: Record<string, unknown>) => ({
      url: m.url as string,
      type: m.type as "image" | "video",
      altText: (m.alt_text as string) || undefined,
    })) })
  })

  return { posts, total: count || posts.length }
}

export async function getPendingFeedbackCount(): Promise<number> {
  if (!supabase || !supabaseConfigured) return 0
  const { count, error } = await supabase
    .from(POSTS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) return 0
  return count || 0
}

// ========== Stats ==========

export async function getFeedbackStats(): Promise<{
  totalFeedbacks: number
  totalComments: number
  totalHelpful: number
  averageRating: number
  pendingCount: number
  categoryCounts: { name: string; count: number }[]
  topFeedbacks: { id: string; title: string; helpfulCount: number; rating: number }[]
  mediaCount: number
}> {
  if (!supabase || !supabaseConfigured) {
    return { totalFeedbacks: 0, totalComments: 0, totalHelpful: 0, averageRating: 0, pendingCount: 0, categoryCounts: [], topFeedbacks: [], mediaCount: 0 }
  }

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select("*")
  if (error || !data) {
    return { totalFeedbacks: 0, totalComments: 0, totalHelpful: 0, averageRating: 0, pendingCount: 0, categoryCounts: [], topFeedbacks: [], mediaCount: 0 }
  }

  const posts = data.map(mapPost)

  const totalFeedbacks = posts.length
  const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0)
  const totalHelpful = posts.reduce((s, p) => s + (p.helpfulCount || 0), 0)
  const totalRating = posts.reduce((s, p) => s + (p.rating || 0), 0)
  const averageRating = totalFeedbacks > 0 ? Math.round((totalRating / totalFeedbacks) * 10) / 10 : 0
  const pendingCount = posts.filter((p) => p.status === "pending").length
  const mediaCount = posts.reduce((s, p) => s + (p.media?.length || 0), 0)

  const catMap = new Map<string, number>()
  for (const p of posts) {
    catMap.set(p.serviceCategory, (catMap.get(p.serviceCategory) || 0) + 1)
  }
  const categoryCounts = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  const topFeedbacks = posts
    .sort((a, b) => b.helpfulCount - a.helpfulCount || b.rating - a.rating)
    .slice(0, 10)
    .map((p) => ({ id: p.id, title: p.title, helpfulCount: p.helpfulCount, rating: p.rating }))

  return { totalFeedbacks, totalComments, totalHelpful, averageRating, pendingCount, categoryCounts, topFeedbacks, mediaCount }
}
