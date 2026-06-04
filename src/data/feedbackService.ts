import { db } from "../lib/firebase"
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  increment,
  type QueryConstraint,
} from "firebase/firestore"
import type { FeedbackPost, FeedbackComment, FeedbackAdminReply, FeedbackStatus, FeedbackMedia, ServiceCategory } from "./feedbackStore"

const POSTS_COL = "feedbackPosts"
const COMMENTS_SUB = "comments"

// ========== Posts ==========

export async function fetchFeedbackPosts(limitCount = 50): Promise<FeedbackPost[]> {
  if (!db) return []
  try {
    const q = query(collection(db, POSTS_COL), orderBy("createdAt", "desc"), limit(limitCount))
    const snap = await getDocs(q)
    return snap.docs.map((d) => mapPost(d.id, d.data()))
  } catch {
    return []
  }
}

export async function fetchFeedbackPostById(id: string): Promise<FeedbackPost | null> {
  if (!db) return null
  try {
    const d = await getDoc(doc(db, POSTS_COL, id))
    if (!d.exists()) return null
    return mapPost(d.id, d.data())
  } catch {
    return null
  }
}

export async function createFeedbackPost(
  post: Omit<FeedbackPost, "id" | "helpfulCount" | "commentCount" | "createdAt" | "updatedAt">,
): Promise<string | null> {
  if (!db) return null
  try {
    const data = toFirestore(post)
    data.helpfulCount = 0
    data.commentCount = 0
    data.status = "pending"
    data.createdAt = Timestamp.fromDate(new Date())
    data.updatedAt = Timestamp.fromDate(new Date())
    const ref = await addDoc(collection(db, POSTS_COL), data)
    return ref.id
  } catch { return null }
}

export async function updateFeedbackPost(id: string, updates: Partial<FeedbackPost>): Promise<void> {
  if (!db) return
  try {
    const data: Record<string, unknown> = {}
    const fields: (keyof FeedbackPost)[] = [
      "title", "content", "serviceCategory", "projectTitle", "projectUrl",
      "rating", "media", "status", "isVerifiedClient", "isVerifiedProject",
      "isHighlighted", "improvementSuggestion", "serviceDate",
    ]
    for (const f of fields) {
      if (updates[f] !== undefined) data[f] = updates[f]
    }
    if (updates.adminReply !== undefined) data.adminReply = updates.adminReply
    data.updatedAt = Timestamp.fromDate(new Date())
    await updateDoc(doc(db, POSTS_COL, id), data)
  } catch { /* silently fail */ }
}

export async function deleteFeedbackPost(id: string): Promise<void> {
  if (!db) return
  try {
    await deleteDoc(doc(db, POSTS_COL, id))
  } catch { /* silently fail */ }
}

// ========== Comments ==========

export async function fetchFeedbackComments(postId: string): Promise<FeedbackComment[]> {
  if (!db) return []
  try {
    const q = query(collection(db, POSTS_COL, postId, COMMENTS_SUB), orderBy("createdAt", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      id: d.id,
      postId,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt,
    })) as FeedbackComment[]
  } catch {
    return []
  }
}

export async function addFeedbackComment(
  postId: string,
  comment: Omit<FeedbackComment, "id" | "postId" | "createdAt">,
): Promise<string | null> {
  if (!db) return null
  try {
    const ref = await addDoc(collection(db, POSTS_COL, postId, COMMENTS_SUB), {
      ...comment,
      createdAt: Timestamp.fromDate(new Date()),
    })
    await updateDoc(doc(db, POSTS_COL, postId), { commentCount: increment(1) })
    return ref.id
  } catch { return null }
}

export async function deleteFeedbackComment(postId: string, commentId: string): Promise<void> {
  if (!db) return
  try {
    await deleteDoc(doc(db, POSTS_COL, postId, COMMENTS_SUB, commentId))
    await updateDoc(doc(db, POSTS_COL, postId), { commentCount: increment(-1) })
  } catch { /* silently fail */ }
}

export async function updateFeedbackCommentStatus(
  postId: string, commentId: string, status: "visible" | "hidden",
): Promise<void> {
  if (!db) return
  try {
    await updateDoc(doc(db, POSTS_COL, postId, COMMENTS_SUB, commentId), { status })
  } catch { /* silently fail */ }
}

// ========== Admin Reply ==========

export async function setAdminReply(
  postId: string,
  reply: Omit<FeedbackAdminReply, "createdAt">,
): Promise<void> {
  if (!db) return
  try {
    await updateDoc(doc(db, POSTS_COL, postId), {
      adminReply: { ...reply, createdAt: Timestamp.fromDate(new Date()) },
      updatedAt: Timestamp.fromDate(new Date()),
    })
  } catch { /* silently fail */ }
}

export async function removeAdminReply(postId: string): Promise<void> {
  if (!db) return
  try {
    await updateDoc(doc(db, POSTS_COL, postId), {
      adminReply: null,
      updatedAt: Timestamp.fromDate(new Date()),
    })
  } catch { /* silently fail */ }
}

// ========== Helpful Votes ==========

const VOTES_COL = "feedbackHelpfulVotes"

export async function toggleHelpfulVote(postId: string, userId: string): Promise<boolean> {
  if (!db) return false
  try {
    const q = query(collection(db, VOTES_COL), where("postId", "==", postId), where("userId", "==", userId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await deleteDoc(doc(db, VOTES_COL, snap.docs[0].id))
      await updateDoc(doc(db, POSTS_COL, postId), { helpfulCount: increment(-1) })
      return false
    }
    await addDoc(collection(db, VOTES_COL), { postId, userId, createdAt: Timestamp.fromDate(new Date()) })
    await updateDoc(doc(db, POSTS_COL, postId), { helpfulCount: increment(1) })
    return true
  } catch { return false }
}

export async function getUserHelpfulVote(postId: string, userId: string): Promise<boolean> {
  if (!db) return false
  try {
    const q = query(collection(db, VOTES_COL), where("postId", "==", postId), where("userId", "==", userId))
    const snap = await getDocs(q)
    return !snap.empty
  } catch { return false }
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
  if (!db) return { posts: [], total: 0 }
  try {
    let q = query(collection(db, POSTS_COL))
    const constraints: QueryConstraint[] = []
    if (statusFilter) {
      constraints.push(where("status", "==", statusFilter))
    } else {
      constraints.push(where("status", "in", ["approved", "highlighted"]))
    }
    if (categoryFilter) {
      constraints.push(where("serviceCategory", "==", categoryFilter))
    }
    if (ratingFilter && ratingFilter > 0) {
      constraints.push(where("rating", "==", ratingFilter))
    }
    q = query(q, ...constraints)
    const snap = await getDocs(q)
    let results = snap.docs.map((d) => mapPost(d.id, d.data()))

    if (queryStr) {
      const lower = queryStr.toLowerCase()
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.content.toLowerCase().includes(lower) ||
          p.userName.toLowerCase().includes(lower) ||
          p.projectTitle.toLowerCase().includes(lower) ||
          p.serviceCategory.toLowerCase().includes(lower),
      )
    }

    switch (sort) {
      case "recent":
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "rating":
        results.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "helpful":
        results.sort((a, b) => b.helpfulCount - a.helpfulCount)
        break
      case "media":
        results = results.filter((p) => p.media.length > 0)
        break
      case "verified":
        results = results.filter((p) => p.isVerifiedClient || p.isVerifiedProject)
        break
    }

    const total = results.length
    const start = (page - 1) * pageSize
    return { posts: results.slice(start, start + pageSize), total }
  } catch {
    return { posts: [], total: 0 }
  }
}

export async function getPendingFeedbackCount(): Promise<number> {
  if (!db) return 0
  try {
    const snap = await getDocs(
      query(collection(db, POSTS_COL), where("status", "==", "pending"))
    )
    return snap.size
  } catch {
    return 0
  }
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
  if (!db) return { totalFeedbacks: 0, totalComments: 0, totalHelpful: 0, averageRating: 0, pendingCount: 0, categoryCounts: [], topFeedbacks: [], mediaCount: 0 }
  try {
    const snap = await getDocs(collection(db, POSTS_COL))
    const posts = snap.docs.map((d) => mapPost(d.id, d.data()))

    const totalFeedbacks = posts.length
    const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0)
    const totalHelpful = posts.reduce((s, p) => s + (p.helpfulCount || 0), 0)
    const totalRating = posts.reduce((s, p) => s + (p.rating || 0), 0)
    const averageRating = totalFeedbacks > 0 ? Math.round((totalRating / totalFeedbacks) * 10) / 10 : 0
    const pendingCount = posts.filter((p) => p.status === "pending").length
    const mediaCount = posts.reduce((s, p) => s + p.media.length, 0)

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
  } catch {
    return { totalFeedbacks: 0, totalComments: 0, totalHelpful: 0, averageRating: 0, pendingCount: 0, categoryCounts: [], topFeedbacks: [], mediaCount: 0 }
  }
}

// ========== Helpers ==========

function mapPost(id: string, data: Record<string, unknown>): FeedbackPost {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : (data.createdAt as string) || new Date().toISOString()
  const updatedAt = data.updatedAt instanceof Timestamp
    ? data.updatedAt.toDate().toISOString()
    : (data.updatedAt as string) || createdAt

  const adminRaw = data.adminReply as Record<string, unknown> | null | undefined
  const adminReply: FeedbackAdminReply | undefined = adminRaw
    ? {
        content: adminRaw.content as string || "",
        adminId: adminRaw.adminId as string || "",
        adminName: adminRaw.adminName as string || "",
        createdAt: adminRaw.createdAt instanceof Timestamp
          ? adminRaw.createdAt.toDate().toISOString()
          : (adminRaw.createdAt as string) || "",
      }
    : undefined

  return {
    id,
    userId: (data.userId as string) || "",
    userName: (data.userName as string) || "Anonymous",
    userAvatar: (data.userAvatar as string) || "",
    serviceCategory: (data.serviceCategory as ServiceCategory) || "Outro",
    projectTitle: (data.projectTitle as string) || "",
    projectUrl: (data.projectUrl as string) || undefined,
    rating: (data.rating as number) || 0,
    title: (data.title as string) || "",
    content: (data.content as string) || "",
    media: (data.media as FeedbackMedia[]) || [],
    serviceDate: (data.serviceDate as string) || undefined,
    status: (data.status as FeedbackStatus) || "pending",
    isVerifiedClient: (data.isVerifiedClient as boolean) || false,
    isVerifiedProject: (data.isVerifiedProject as boolean) || false,
    isHighlighted: (data.isHighlighted as boolean) || false,
    helpfulCount: (data.helpfulCount as number) || 0,
    commentCount: (data.commentCount as number) || 0,
    createdAt,
    updatedAt,
    adminReply,
    improvementSuggestion: (data.improvementSuggestion as string) || undefined,
  }
}

function toFirestore(post: Partial<FeedbackPost>): Record<string, unknown> {
  const data: Record<string, unknown> = { ...post }
  if (post.createdAt) data.createdAt = Timestamp.fromDate(new Date(post.createdAt))
  if (post.updatedAt) data.updatedAt = Timestamp.fromDate(new Date(post.updatedAt))
  return data
}
