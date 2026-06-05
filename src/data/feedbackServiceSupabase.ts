import { supabase, supabaseConfigured } from "../lib/supabase/client";
import type {
  FeedbackPost,
  FeedbackComment,
  FeedbackAdminReply,
  FeedbackMedia,
  FeedbackVoteType,
  ReactionType,
  FeedbackStatus,
  ServiceCategory,
} from "./feedbackStore";

const POSTS_TABLE = "feedback_posts";
const MEDIA_TABLE = "feedback_media";
const COMMENTS_TABLE = "feedback_comments";
const VOTES_TABLE = "feedback_votes";
const REACTIONS_TABLE = "feedback_reactions";
const SAVED_TABLE = "saved_feedbacks";
const PROFILES_TABLE = "profiles";
const FOLLOWS_TABLE = "social_follows";
const CONVERSATIONS_TABLE = "conversations";
const MESSAGES_TABLE = "messages";

// ========== Mapping helpers ==========

function mapPost(row: Record<string, unknown>): FeedbackPost {
  const adminReplyRaw = row.admin_reply as Record<string, unknown> | null;
  const adminReply: FeedbackAdminReply | undefined = adminReplyRaw
    ? {
        content: (adminReplyRaw.content as string) || "",
        adminId:
          (adminReplyRaw.admin_id as string) ||
          (adminReplyRaw.adminId as string) ||
          "",
        adminName:
          (adminReplyRaw.admin_name as string) ||
          (adminReplyRaw.adminName as string) ||
          "",
        createdAt:
          (adminReplyRaw.created_at as string) ||
          (adminReplyRaw.createdAt as string) ||
          "",
      }
    : undefined;

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
    downvoteCount: (row.downvote_count as number) || 0,
    commentCount: (row.comment_count as number) || 0,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt:
      (row.updated_at as string) ||
      (row.created_at as string) ||
      new Date().toISOString(),
    adminReply,
    improvementSuggestion: (row.improvement_suggestion as string) || undefined,
  };
}

function toSnake(data: Partial<FeedbackPost>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.userId !== undefined) out.user_id = data.userId;
  if (data.userName !== undefined) out.user_name = data.userName;
  if (data.userAvatar !== undefined) out.user_avatar = data.userAvatar;
  if (data.serviceCategory !== undefined)
    out.service_category = data.serviceCategory;
  if (data.projectTitle !== undefined) out.project_title = data.projectTitle;
  if (data.projectUrl !== undefined) out.project_url = data.projectUrl;
  if (data.rating !== undefined) out.star_rating = data.rating;
  if (data.title !== undefined) out.title = data.title;
  if (data.content !== undefined) out.body = data.content;
  if (data.status !== undefined) out.status = data.status;
  if (data.serviceDate !== undefined) out.service_date = data.serviceDate;
  if (data.isVerifiedClient !== undefined)
    out.is_verified_client = data.isVerifiedClient;
  if (data.isVerifiedProject !== undefined)
    out.is_verified_project = data.isVerifiedProject;
  if (data.isHighlighted !== undefined) out.is_highlighted = data.isHighlighted;
  if (data.helpfulCount !== undefined) out.helpful_count = data.helpfulCount;
  if (data.downvoteCount !== undefined) out.downvote_count = data.downvoteCount;
  if (data.commentCount !== undefined) out.comment_count = data.commentCount;
  if (data.improvementSuggestion !== undefined)
    out.improvement_suggestion = data.improvementSuggestion;
  if (data.adminReply !== undefined) {
    const ar = data.adminReply as FeedbackAdminReply;
    out.admin_reply = {
      content: ar.content,
      admin_id: ar.adminId,
      admin_name: ar.adminName,
      created_at: ar.createdAt,
    };
  }
  return out;
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
  };
}

async function applyProfileAuthors(posts: FeedbackPost[]): Promise<FeedbackPost[]> {
  if (!supabase || !supabaseConfigured || posts.length === 0) return posts;
  const ids = [...new Set(posts.map((post) => post.userId).filter(Boolean))];
  if (ids.length === 0) return posts;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, avatar_url, username")
    .in("id", ids);

  if (error || !data) return posts;

  const profiles = new Map(
    (data as Record<string, unknown>[]).map((profile) => [
      profile.id as string,
      profile,
    ]),
  );

  return posts.map((post) => {
    const profile = profiles.get(post.userId);
    if (!profile) return post;
    return {
      ...post,
      userName:
        (profile.full_name as string) ||
        (profile.username as string) ||
        post.userName,
      userAvatar: (profile.avatar_url as string) || post.userAvatar,
    };
  });
}

// ========== Posts ==========

export async function fetchFeedbackPosts(
  limitCount = 50,
): Promise<FeedbackPost[]> {
  if (!supabase || !supabaseConfigured) return [];
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`)
    .order("created_at", { ascending: false })
    .limit(limitCount);
  if (error) return [];
  const posts = (data || []).map((row: Record<string, unknown>) => {
    const media =
      (row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || [];
    return mapPost({
      ...row,
      media: media.map((m: Record<string, unknown>) => ({
        url: m.url as string,
        type: m.type as "image" | "video",
        altText: (m.alt_text as string) || undefined,
      })),
    });
  });
  return applyProfileAuthors(posts);
}

export async function fetchFeedbackPostById(
  id: string,
): Promise<FeedbackPost | null> {
  if (!supabase || !supabaseConfigured) return null;
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const media =
    (data[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || [];
  const post = mapPost({
    ...data,
    media: media.map((m: Record<string, unknown>) => ({
      url: m.url as string,
      type: m.type as "image" | "video",
      altText: (m.alt_text as string) || undefined,
    })),
  });
  return (await applyProfileAuthors([post]))[0] || post;
}

export async function createFeedbackPost(
  post: Omit<
    FeedbackPost,
    "id" | "helpfulCount" | "commentCount" | "createdAt" | "updatedAt"
  >,
): Promise<string | null> {
  if (!supabase || !supabaseConfigured) {
    console.error("createFeedbackPost: Supabase not configured");
    return null;
  }
  try {
    const dbData = toSnake(post);
    dbData.helpful_count = 0;
    dbData.comment_count = 0;
    dbData.status = "approved";
    dbData.created_at = new Date().toISOString();
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(POSTS_TABLE)
      .insert(dbData)
      .select("id")
      .single();
    if (error) {
      console.error("createFeedbackPost failed", error);
      return null;
    }
    const postId = (data as { id: string }).id;

    if (post.media?.length) {
      const { error: mediaError } = await supabase.from(MEDIA_TABLE).insert(
        post.media.map((media, index) => ({
          post_id: postId,
          type: media.type,
          url: media.url,
          alt_text: media.altText || "",
          order_index: index,
        })),
      );

      if (mediaError) {
        console.error("createFeedbackPost media insert failed", mediaError);
      } else {
        await supabase
          .from(POSTS_TABLE)
          .update({ media_count: post.media.length })
          .eq("id", postId);
      }
    }

    return postId;
  } catch (e) {
    console.error("createFeedbackPost error", e);
    return null;
  }
}

export async function updateFeedbackPost(
  id: string,
  updates: Partial<FeedbackPost>,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  const allowedFields = [
    "title",
    "content",
    "serviceCategory",
    "projectTitle",
    "projectUrl",
    "rating",
    "status",
    "isVerifiedClient",
    "isVerifiedProject",
    "isHighlighted",
    "improvementSuggestion",
    "serviceDate",
  ] as (keyof FeedbackPost)[];
  const dbData = toSnake(updates);
  for (const key of Object.keys(dbData)) {
    if (
      !allowedFields.some(
        (f) =>
          toSnake({ [f]: true } as Partial<FeedbackPost>)[key] !== undefined,
      )
    ) {
      delete dbData[key];
    }
  }
  dbData.updated_at = new Date().toISOString();
  await supabase.from(POSTS_TABLE).update(dbData).eq("id", id);
}

export async function deleteFeedbackPost(id: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase.from(POSTS_TABLE).delete().eq("id", id);
}

// ========== Comments ==========

async function applyProfileAuthorsToComments(comments: FeedbackComment[]): Promise<FeedbackComment[]> {
  if (!supabase || !supabaseConfigured || comments.length === 0) return comments;
  const ids = [...new Set(comments.map((c) => c.userId).filter(Boolean))];
  if (ids.length === 0) return comments;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, avatar_url, username")
    .in("id", ids);

  if (error || !data) return comments;

  const profiles = new Map(
    (data as Record<string, unknown>[]).map((profile) => [
      profile.id as string,
      profile,
    ]),
  );

  return comments.map((comment) => {
    const profile = profiles.get(comment.userId);
    if (!profile) return comment;
    return {
      ...comment,
      userName:
        (profile.full_name as string) ||
        (profile.username as string) ||
        comment.userName,
      userAvatar: (profile.avatar_url as string) || comment.userAvatar,
    };
  });
}

export async function fetchFeedbackComments(
  postId: string,
): Promise<FeedbackComment[]> {
  if (!supabase || !supabaseConfigured) return [];
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) return [];
  const comments = (data || []).map(mapComment);
  return applyProfileAuthorsToComments(comments);
}

export async function addFeedbackComment(
  postId: string,
  comment: Omit<FeedbackComment, "id" | "postId" | "createdAt">,
): Promise<string | null> {
  if (!supabase || !supabaseConfigured) return null;
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .insert({
      post_id: postId,
      user_id: comment.userId,
      user_name: comment.userName,
      body: comment.content,
      status: comment.status || "visible",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return null;
  const commentId = (data as { id: string }).id;
  await supabase.rpc("increment_comment_count", { post_id: postId });
  return commentId;
}

export async function deleteFeedbackComment(
  postId: string,
  commentId: string,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase
    .from(COMMENTS_TABLE)
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId);
  await supabase.rpc("decrement_comment_count", { post_id: postId });
}

export async function updateFeedbackCommentStatus(
  postId: string,
  commentId: string,
  status: "visible" | "hidden",
): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase
    .from(COMMENTS_TABLE)
    .update({ status })
    .eq("id", commentId)
    .eq("post_id", postId);
}

// ========== Admin Reply ==========

export async function setAdminReply(
  postId: string,
  reply: Omit<FeedbackAdminReply, "createdAt">,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase
    .from(POSTS_TABLE)
    .update({
      admin_reply: { ...reply, createdAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);
}

export async function removeAdminReply(postId: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase
    .from(POSTS_TABLE)
    .update({ admin_reply: null, updated_at: new Date().toISOString() })
    .eq("id", postId);
}

// ========== Helpful Votes ==========

export async function toggleFeedbackVote(
  postId: string,
  userId: string,
  voteType: FeedbackVoteType,
): Promise<FeedbackVoteType | null> {
  if (!supabase || !supabaseConfigured) return null;
  const { data: existing, error: selectError } = await supabase
    .from(VOTES_TABLE)
    .select("id, vote_type")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError && selectError.message?.includes("vote_type")) {
    return toggleLegacyHelpfulVote(postId, userId, voteType);
  }

  if (selectError && selectError.code !== "PGRST116") {
    console.error("toggleFeedbackVote select failed", selectError);
  }

  const existingVote = existing as { id: string; vote_type?: FeedbackVoteType } | null;

  if (existingVote) {
    if ((existingVote?.vote_type || "up") === voteType) {
      await supabase.from(VOTES_TABLE).delete().eq("id", existingVote.id);
      await adjustVoteCount(postId, voteType, -1);
      return null;
    }

    const { error: updateError } = await supabase
      .from(VOTES_TABLE)
      .update({ vote_type: voteType })
      .eq("id", existingVote.id);

    if (updateError) {
      console.error("toggleFeedbackVote update failed", updateError);
      return existingVote?.vote_type || null;
    }

    await adjustVoteCount(postId, existingVote?.vote_type || "up", -1);
    await adjustVoteCount(postId, voteType, 1);
    return voteType;
  }

  const { error: insertError } = await supabase
    .from(VOTES_TABLE)
    .insert(
      { post_id: postId, user_id: userId, vote_type: voteType },
    );

  if (insertError) {
    if (insertError.message?.includes("vote_type")) {
      return toggleLegacyHelpfulVote(postId, userId, voteType);
    }
    return null;
  }

  await adjustVoteCount(postId, voteType, 1);
  return voteType;
}

async function toggleLegacyHelpfulVote(
  postId: string,
  userId: string,
  voteType: FeedbackVoteType,
): Promise<FeedbackVoteType | null> {
  if (!supabase || !supabaseConfigured) return null;

  const { data: existing } = await supabase
    .from(VOTES_TABLE)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from(VOTES_TABLE).delete().eq("id", (existing as { id: string }).id);
    if (voteType === "up") await adjustVoteCount(postId, "up", -1);
    return null;
  }

  if (voteType === "down") return null;

  const { error } = await supabase
    .from(VOTES_TABLE)
    .insert({ post_id: postId, user_id: userId });

  if (error) {
    return null;
  }

  await adjustVoteCount(postId, "up", 1);
  return "up";
}

export async function toggleHelpfulVote(
  postId: string,
  userId: string,
): Promise<boolean> {
  const vote = await toggleFeedbackVote(postId, userId, "up");
  return vote === "up";
}

async function adjustVoteCount(
  postId: string,
  voteType: FeedbackVoteType,
  amount: 1 | -1,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  const prefix = amount > 0 ? "increment" : "decrement";
  const fn =
    voteType === "up"
      ? `${prefix}_helpful_count`
      : `${prefix}_downvote_count`;
  const { error } = await supabase.rpc(fn, { post_id: postId });
  if (error && voteType === "down") {
    console.warn(`${fn} RPC unavailable. Apply migration 003 to persist downvote counts.`, error);
  }
}

export async function getUserFeedbackVote(
  postId: string,
  userId: string,
): Promise<FeedbackVoteType | null> {
  if (!supabase || !supabaseConfigured) return null;
  const { data, error } = await supabase
    .from(VOTES_TABLE)
    .select("id, vote_type")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error?.message?.includes("vote_type")) {
    return (await getUserHelpfulVoteLegacy(postId, userId)) ? "up" : null;
  }
  if (error) return null;
  if (!data) return null;
  return ((data as { vote_type?: FeedbackVoteType }).vote_type || "up") as FeedbackVoteType;
}

async function getUserHelpfulVoteLegacy(
  postId: string,
  userId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false;
  const { data } = await supabase
    .from(VOTES_TABLE)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function getUserHelpfulVote(
  postId: string,
  userId: string,
): Promise<boolean> {
  return (await getUserFeedbackVote(postId, userId)) === "up";
}

// ========== Reactions (new: feedback_reactions) ==========

export async function toggleReaction(
  feedbackId: string,
  reactionType: ReactionType,
): Promise<ReactionType | null> {
  if (!supabase || !supabaseConfigured) return null;
  const { data, error } = await supabase.rpc("toggle_feedback_reaction", {
    p_feedback_id: feedbackId,
    p_reaction_type: reactionType,
  });
  if (error) {
    console.error("toggleReaction RPC failed", error);
    return null;
  }
  return (data as ReactionType) || null;
}

export async function fetchUserReactions(
  feedbackIds: string[],
  userId: string,
): Promise<Map<string, ReactionType>> {
  const result = new Map<string, ReactionType>();
  if (!supabase || !supabaseConfigured || feedbackIds.length === 0 || !userId) return result;

  const { data, error } = await supabase
    .from(REACTIONS_TABLE)
    .select("feedback_id, reaction_type")
    .in("feedback_id", feedbackIds)
    .eq("user_id", userId);

  if (error || !data) return result;
  for (const row of data as { feedback_id: string; reaction_type: ReactionType }[]) {
    result.set(row.feedback_id, row.reaction_type);
  }
  return result;
}

// ========== Saved Posts ==========

export async function getUserSavedPostIds(userId: string): Promise<Set<string>> {
  if (!supabase || !supabaseConfigured) return new Set();

  const { data, error } = await supabase
    .from(SAVED_TABLE)
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    console.error("getUserSavedPostIds failed", error);
    return new Set();
  }

  return new Set((data || []).map((row) => (row as { post_id: string }).post_id));
}

export async function toggleSavedFeedbackPost(
  postId: string,
  userId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false;

  const { data: existing, error: selectError } = await supabase
    .from(SAVED_TABLE)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    console.error("toggleSavedFeedbackPost select failed", selectError);
    return false;
  }

  if (existing) {
    const { error } = await supabase
      .from(SAVED_TABLE)
      .delete()
      .eq("id", (existing as { id: string }).id);
    if (error) console.error("toggleSavedFeedbackPost delete failed", error);
    return false;
  }

  const { error } = await supabase
    .from(SAVED_TABLE)
    .insert({ post_id: postId, user_id: userId });

  if (error) {
    console.error("toggleSavedFeedbackPost insert failed", error);
    return false;
  }

  return true;
}

export async function saveFeedbackPost(
  postId: string,
  userId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false;

  const { error } = await supabase
    .from(SAVED_TABLE)
    .upsert(
      { post_id: postId, user_id: userId },
      { onConflict: "user_id,post_id" },
    );

  if (error) {
    console.error("saveFeedbackPost failed", error);
    return false;
  }

  return true;
}

export async function removeSavedFeedbackPost(
  postId: string,
  userId: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false;

  const { error } = await supabase
    .from(SAVED_TABLE)
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (error) {
    console.error("removeSavedFeedbackPost failed", error);
    return false;
  }

  return true;
}

export async function fetchSavedFeedbackPosts(userId: string): Promise<FeedbackPost[]> {
  if (!supabase || !supabaseConfigured) return [];

  const { data: savedRows, error: savedError } = await supabase
    .from(SAVED_TABLE)
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savedError) {
    console.error("fetchSavedFeedbackPosts saved query failed", savedError);
    return [];
  }

  const saved = (savedRows || []) as { post_id: string; created_at: string }[];
  const postIds = saved.map((row) => row.post_id);
  if (postIds.length === 0) return [];

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`)
    .in("id", postIds)
    .in("status", ["approved", "highlighted"]);

  if (error) {
    console.error("fetchSavedFeedbackPosts posts query failed", error);
    return [];
  }

  const savedAtByPost = new Map(saved.map((row) => [row.post_id, row.created_at]));
  const orderByPost = new Map(saved.map((row, index) => [row.post_id, index]));

  const posts = (data || [])
    .map((row: Record<string, unknown>) => {
      const media =
        (row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || [];
      return {
        ...mapPost({
          ...row,
          media: media.map((m: Record<string, unknown>) => ({
            url: m.url as string,
            type: m.type as "image" | "video",
            altText: (m.alt_text as string) || undefined,
          })),
        }),
        savedAt: savedAtByPost.get(row.id as string),
      };
    })
    .sort(
      (a, b) =>
        (orderByPost.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderByPost.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  return applyProfileAuthors(posts);
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
  if (!supabase || !supabaseConfigured) return { posts: [], total: 0 };

  let q = supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`, { count: "exact" });

  if (statusFilter) {
    q = q.eq("status", statusFilter);
  } else {
    q = q.in("status", ["approved", "highlighted"]);
  }

  if (categoryFilter) {
    q = q.eq("service_category", categoryFilter);
  }
  if (ratingFilter && ratingFilter > 0) {
    q = q.gte("star_rating", ratingFilter);
  }

  switch (sort) {
    case "recent":
      q = q.order("created_at", { ascending: false });
      break;
    case "rating":
      q = q
        .order("star_rating", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "helpful":
      q = q.order("helpful_count", { ascending: false });
      break;
    case "verified":
      q = q.or("is_verified_client.eq.true,is_verified_project.eq.true");
      q = q.order("created_at", { ascending: false });
      break;
    case "media":
      q = q.gt("media_count", 0).order("created_at", { ascending: false });
      break;
  }

  if (queryStr) {
    const like = `%${queryStr.toLowerCase()}%`;
    q = q.or(
      `title.ilike.${like},body.ilike.${like},user_name.ilike.${like},project_title.ilike.${like},service_category.ilike.${like}`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  q = q.range(from, to);

  const { data, count, error } = await q;
  if (error) return { posts: [], total: 0 };

  const posts = (data || []).map((row: Record<string, unknown>) => {
    const media =
      (row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || [];
    return mapPost({
      ...row,
      media: media.map((m: Record<string, unknown>) => ({
        url: m.url as string,
        type: m.type as "image" | "video",
        altText: (m.alt_text as string) || undefined,
      })),
    });
  });

  return { posts: await applyProfileAuthors(posts), total: count || posts.length };
}

export async function getPendingFeedbackCount(): Promise<number> {
  if (!supabase || !supabaseConfigured) return 0;
  const { count, error } = await supabase
    .from(POSTS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count || 0;
}

// ========== Public Profiles, Follows & Messages ==========

export interface PublicProfileData {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  memberSince?: string;
  posts: FeedbackPost[];
  stats: {
    totalPosts: number;
    totalLikesReceived: number;
    followers: number;
    following: number;
  };
}

export interface ConversationSummary {
  id: string;
  otherUserId: string;
  otherName: string;
  otherAvatar?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfileData | null> {
  if (!supabase || !supabaseConfigured) return null;

  const { data: profile } = await supabase
    .from(PROFILES_TABLE)
    .select("id, username, full_name, avatar_url, bio, updated_at")
    .eq("id", userId)
    .maybeSingle();

  const { data: postsData } = await supabase
    .from(POSTS_TABLE)
    .select(`*, ${MEDIA_TABLE}(*)`)
    .eq("user_id", userId)
    .in("status", ["approved", "highlighted"])
    .order("created_at", { ascending: false });

  const posts = await applyProfileAuthors(
    ((postsData || []) as Record<string, unknown>[]).map((row) => {
      const media =
        (row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || [];
      return mapPost({
        ...row,
        media: media.map((m: Record<string, unknown>) => ({
          url: m.url as string,
          type: m.type as "image" | "video",
          altText: (m.alt_text as string) || undefined,
        })),
      });
    }),
  );

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from(FOLLOWS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from(FOLLOWS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  const profileRow = (profile || {}) as Record<string, unknown>;
  return {
    id: userId,
    name:
      (profileRow.full_name as string) ||
      posts[0]?.userName ||
      "CAFÉ Services User",
    username: (profileRow.username as string) || undefined,
    avatarUrl: (profileRow.avatar_url as string) || posts[0]?.userAvatar,
    bio: (profileRow.bio as string) || undefined,
    role: "Client",
    memberSince: posts[posts.length - 1]?.createdAt || (profileRow.updated_at as string),
    posts,
    stats: {
      totalPosts: posts.length,
      totalLikesReceived: posts.reduce((sum, post) => sum + post.helpfulCount, 0),
      followers: followers || 0,
      following: following || 0,
    },
  };
}

export async function isFollowingProfile(currentUserId: string, profileId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false;
  const { data } = await supabase
    .from(FOLLOWS_TABLE)
    .select("id")
    .eq("follower_id", currentUserId)
    .eq("following_id", profileId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollowProfile(currentUserId: string, profileId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured || currentUserId === profileId) return false;
  const following = await isFollowingProfile(currentUserId, profileId);
  if (following) {
    await supabase
      .from(FOLLOWS_TABLE)
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", profileId);
    return false;
  }
  await supabase
    .from(FOLLOWS_TABLE)
    .upsert(
      { follower_id: currentUserId, following_id: profileId },
      { onConflict: "follower_id,following_id" },
    );
  return true;
}

export async function getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string | null> {
  if (!supabase || !supabaseConfigured || currentUserId === otherUserId) return null;
  const [participant1, participant2] = [currentUserId, otherUserId].sort();

  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .upsert(
      { participant_1: participant1, participant_2: participant2 },
      { onConflict: "participant_1,participant_2" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("getOrCreateConversation failed", error);
    return null;
  }
  return (data as { id: string }).id;
}

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  if (!supabase || !supabaseConfigured) return [];
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select("*")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as Record<string, unknown>[];
  const otherIds = rows.map((row) =>
    row.participant_1 === userId ? row.participant_2 as string : row.participant_1 as string,
  );

  const [{ data: profiles }, { data: messages }] = await Promise.all([
    supabase.from(PROFILES_TABLE).select("id, full_name, username, avatar_url").in("id", otherIds),
    supabase
      .from(MESSAGES_TABLE)
      .select("id, conversation_id, sender_id, receiver_id, content, message_type, media_url, caption, delivered_at, read_at, created_at")
      .in("conversation_id", rows.map((row) => row.id as string))
      .order("created_at", { ascending: false }),
  ]);

  const profilesById = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id as string, p]));
  const messagesByConversation = new Map<string, Record<string, unknown>[]>();
  for (const message of (messages || []) as Record<string, unknown>[]) {
    const list = messagesByConversation.get(message.conversation_id as string) || [];
    list.push(message);
    messagesByConversation.set(message.conversation_id as string, list);
  }

  return rows.map((row) => {
    const otherUserId = row.participant_1 === userId ? row.participant_2 as string : row.participant_1 as string;
    const profile = profilesById.get(otherUserId);
    const conversationMessages = messagesByConversation.get(row.id as string) || [];
    const last = conversationMessages[0];
    return {
      id: row.id as string,
      otherUserId,
      otherName: (profile?.full_name as string) || (profile?.username as string) || "User",
      otherAvatar: (profile?.avatar_url as string) || undefined,
      lastMessage: (last?.content as string) || "",
      lastMessageAt: ((last?.created_at as string) || row.last_message_at) as string,
      unreadCount: conversationMessages.filter((m) => m.sender_id !== userId && !m.read_at).length,
    };
  });
}

export async function fetchConversationMessages(conversationId: string): Promise<DirectMessage[]> {
  if (!supabase || !supabaseConfigured) return [];
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    content: row.content as string,
    readAt: (row.read_at as string) || null,
    createdAt: row.created_at as string,
  }));
}

export async function sendDirectMessage(conversationId: string, senderId: string, content: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase.from(MESSAGES_TABLE).insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
  });
  await supabase
    .from(CONVERSATIONS_TABLE)
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function markConversationRead(conversationId: string, currentUserId: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return;
  await supabase
    .from(MESSAGES_TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUserId);
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const conversations = await fetchConversations(userId);
  return conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

// ========== Stats ==========

export async function getFeedbackStats(): Promise<{
  totalFeedbacks: number;
  totalComments: number;
  totalHelpful: number;
  averageRating: number;
  pendingCount: number;
  categoryCounts: { name: string; count: number }[];
  topFeedbacks: {
    id: string;
    title: string;
    helpfulCount: number;
    rating: number;
  }[];
  mediaCount: number;
}> {
  if (!supabase || !supabaseConfigured) {
    return {
      totalFeedbacks: 0,
      totalComments: 0,
      totalHelpful: 0,
      averageRating: 0,
      pendingCount: 0,
      categoryCounts: [],
      topFeedbacks: [],
      mediaCount: 0,
    };
  }

  const { data, error } = await supabase.from(POSTS_TABLE).select("*");
  if (error || !data) {
    return {
      totalFeedbacks: 0,
      totalComments: 0,
      totalHelpful: 0,
      averageRating: 0,
      pendingCount: 0,
      categoryCounts: [],
      topFeedbacks: [],
      mediaCount: 0,
    };
  }

  const posts = data.map(mapPost);

  const totalFeedbacks = posts.length;
  const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);
  const totalHelpful = posts.reduce((s, p) => s + (p.helpfulCount || 0), 0);
  const totalRating = posts.reduce((s, p) => s + (p.rating || 0), 0);
  const averageRating =
    totalFeedbacks > 0
      ? Math.round((totalRating / totalFeedbacks) * 10) / 10
      : 0;
  const pendingCount = posts.filter((p) => p.status === "pending").length;
  const mediaCount = posts.reduce((s, p) => s + (p.media?.length || 0), 0);

  const catMap = new Map<string, number>();
  for (const p of posts) {
    catMap.set(p.serviceCategory, (catMap.get(p.serviceCategory) || 0) + 1);
  }
  const categoryCounts = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const topFeedbacks = posts
    .sort((a, b) => b.helpfulCount - a.helpfulCount || b.rating - a.rating)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      title: p.title,
      helpfulCount: p.helpfulCount,
      rating: p.rating,
    }));

  return {
    totalFeedbacks,
    totalComments,
    totalHelpful,
    averageRating,
    pendingCount,
    categoryCounts,
    topFeedbacks,
    mediaCount,
  };
}
