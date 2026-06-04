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
  or,
} from "firebase/firestore"
import type { ForumCategory, ForumPost, ForumComment, ForumAuthor, SortMode, PostStatus } from "./forumStore"

const CATEGORIES_COL = "forumCategories"
const POSTS_COL = "forumPosts"
const COMMENTS_SUB = "comments"
const VOTES_COL = "forumVotes"
const BOOKMARKS_COL = "forumBookmarks"

// ========== Categories ==========

export async function fetchCategories(): Promise<ForumCategory[]> {
  if (!db) return []
  try {
    const q = query(collection(db, CATEGORIES_COL), orderBy("name", "asc"))
    const snap = await getDocs(q)
    if (snap.empty) {
      await seedCategories()
      return fetchCategories()
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ForumCategory))
  } catch {
    return []
  }
}

async function seedCategories() {
  if (!db) return
  const cats = [
    { name: "Web Apps", slug: "web-apps", description: "Web application projects and case studies", icon: "Layout", postCount: 0 },
    { name: "Landing Pages", slug: "landing-pages", description: "Landing page designs and optimizations", icon: "FileText", postCount: 0 },
    { name: "SaaS", slug: "saas", description: "SaaS platform development and scaling", icon: "Cloud", postCount: 0 },
    { name: "Results", slug: "results", description: "Proven results and performance metrics", icon: "TrendingUp", postCount: 0 },
    { name: "Testimonials", slug: "testimonials", description: "Client testimonials and success stories", icon: "Star", postCount: 0 },
  ]
  for (const c of cats) {
    await addDoc(collection(db, CATEGORIES_COL), c)
  }
}

export async function createCategory(data: { name: string; slug: string; description: string; icon: string }): Promise<string | null> {
  if (!db) return null
  try {
    const ref = await addDoc(collection(db, CATEGORIES_COL), { ...data, postCount: 0 })
    return ref.id
  } catch { return null }
}

export async function updateCategory(id: string, data: Partial<ForumCategory>): Promise<void> {
  if (!db) return
  try { await updateDoc(doc(db, CATEGORIES_COL, id), data) } catch { /* category may not exist */ }
}

export async function deleteCategory(id: string): Promise<void> {
  if (!db) return
  try { await deleteDoc(doc(db, CATEGORIES_COL, id)) } catch { /* category may not exist */ }
}

// ========== Posts ==========

export async function fetchForumPosts(limitCount = 50): Promise<ForumPost[]> {
  if (!db) return []
  try {
    const q = query(collection(db, POSTS_COL), orderBy("createdAt", "desc"), limit(limitCount))
    const snap = await getDocs(q)
    return snap.docs.map((d) => mapPost(d.id, d.data()))
  } catch {
    return []
  }
}

export async function fetchPostBySlug(slug: string): Promise<ForumPost | null> {
  if (!db) return null
  try {
    const q = query(collection(db, POSTS_COL), where("slug", "==", slug), limit(1))
    const snap = await getDocs(q)
    if (snap.empty) return null
    return mapPost(snap.docs[0].id, snap.docs[0].data())
  } catch {
    return null
  }
}

export async function fetchPostById(id: string): Promise<ForumPost | null> {
  if (!db) return null
  try {
    const d = await getDoc(doc(db, POSTS_COL, id))
    if (!d.exists()) return null
    return mapPost(d.id, d.data())
  } catch {
    return null
  }
}

export async function createForumPost(post: Omit<ForumPost, "id" | "upvotes" | "commentCount">): Promise<string | null> {
  if (!db) return null
  try {
    const data = toFirestore(post)
    data.upvotes = 0
    data.commentCount = 0
    const ref = await addDoc(collection(db, POSTS_COL), data)
    // increment category counter
    await updateDoc(doc(db, CATEGORIES_COL, post.categoryId), { postCount: increment(1) })
    return ref.id
  } catch { return null }
}

export async function updateForumPost(id: string, updates: Partial<ForumPost>): Promise<void> {
  if (!db) return
  try {
    const data: Record<string, unknown> = {}
    if (updates.title !== undefined) data.title = updates.title
    if (updates.body !== undefined) data.body = updates.body
    if (updates.slug !== undefined) data.slug = updates.slug
    if (updates.categoryId !== undefined) data.categoryId = updates.categoryId
    if (updates.tags !== undefined) data.tags = updates.tags
    if (updates.media !== undefined) data.media = updates.media
    if (updates.metrics !== undefined) data.metrics = updates.metrics
    if (updates.featured !== undefined) data.featured = updates.featured
    if (updates.pinned !== undefined) data.pinned = updates.pinned
    if (updates.verifiedResult !== undefined) data.verifiedResult = updates.verifiedResult
    if (updates.status !== undefined) data.status = updates.status
    data.updatedAt = Timestamp.fromDate(new Date())
    await updateDoc(doc(db, POSTS_COL, id), data)
  } catch { /* silently fail */ }
}

export async function deleteForumPost(id: string, categoryId?: string): Promise<void> {
  if (!db) return
  try {
    await deleteDoc(doc(db, POSTS_COL, id))
    if (categoryId) {
      const cat = await getDoc(doc(db, CATEGORIES_COL, categoryId))
      if (cat.exists() && (cat.data().postCount || 0) > 0) {
        await updateDoc(doc(db, CATEGORIES_COL, categoryId), { postCount: increment(-1) })
      }
    }
  } catch { /* silently fail */ }
}

// ========== Comments ==========

export async function fetchPostComments(postId: string): Promise<ForumComment[]> {
  if (!db) return []
  try {
    const q = query(collection(db, POSTS_COL, postId, COMMENTS_SUB), orderBy("createdAt", "asc"))
    const snap = await getDocs(q)
    const all: ForumComment[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt,
    })) as ForumComment[]

    const top = all.filter((c) => !c.parentId)
    const replies = all.filter((c) => c.parentId)
    return top.map((c) => ({ ...c, replies: replies.filter((r) => r.parentId === c.id) }))
  } catch {
    return []
  }
}

export async function addComment(
  postId: string,
  comment: Omit<ForumComment, "id" | "postId" | "replies">,
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

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  if (!db) return
  try {
    await deleteDoc(doc(db, POSTS_COL, postId, COMMENTS_SUB, commentId))
    await updateDoc(doc(db, POSTS_COL, postId), { commentCount: increment(-1) })
  } catch { /* silently fail */ }
}

// ========== Votes ==========

export async function votePost(postId: string, userId: string, value: 1 | -1): Promise<void> {
  if (!db) return
  try {
    const q = query(collection(db, VOTES_COL), where("postId", "==", postId), where("userId", "==", userId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const existing = snap.docs[0]
      const prevValue = existing.data().value as number
      if (prevValue === value) {
        await deleteDoc(doc(db, VOTES_COL, existing.id))
        await updateDoc(doc(db, POSTS_COL, postId), { upvotes: increment(-prevValue) })
      } else {
        await updateDoc(doc(db, VOTES_COL, existing.id), { value })
        await updateDoc(doc(db, POSTS_COL, postId), { upvotes: increment(value - prevValue) })
      }
    } else {
      await addDoc(collection(db, VOTES_COL), { postId, userId, value, createdAt: Timestamp.fromDate(new Date()) })
      await updateDoc(doc(db, POSTS_COL, postId), { upvotes: increment(value) })
    }
  } catch { /* silently fail */ }
}

export async function getUserVote(postId: string, userId: string): Promise<number> {
  if (!db) return 0
  try {
    const q = query(collection(db, VOTES_COL), where("postId", "==", postId), where("userId", "==", userId))
    const snap = await getDocs(q)
    if (snap.empty) return 0
    return snap.docs[0].data().value as number
  } catch { return 0 }
}

// ========== Bookmarks ==========

export async function toggleBookmark(postId: string, userId: string): Promise<boolean> {
  if (!db) return false
  try {
    const q = query(collection(db, BOOKMARKS_COL), where("postId", "==", postId), where("userId", "==", userId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await deleteDoc(doc(db, BOOKMARKS_COL, snap.docs[0].id))
      return false
    }
    await addDoc(collection(db, BOOKMARKS_COL), { postId, userId, createdAt: Timestamp.fromDate(new Date()) })
    return true
  } catch { return false }
}

export async function getBookmarkStatus(postId: string, userId: string): Promise<boolean> {
  if (!db) return false
  try {
    const q = query(collection(db, BOOKMARKS_COL), where("postId", "==", postId), where("userId", "==", userId))
    const snap = await getDocs(q)
    return !snap.empty
  } catch { return false }
}

// ========== Search ==========

export async function searchForumPosts(
  queryStr: string,
  categoryFilter?: string,
  sort: SortMode = "hot",
  page = 1,
  pageSize = 20,
): Promise<{ posts: ForumPost[]; total: number }> {
  if (!db) return { posts: [], total: 0 }
  try {
    let q = query(collection(db, POSTS_COL))

    if (categoryFilter) {
      q = query(q, where("categoryId", "==", categoryFilter))
    }

    if (queryStr) {
      const words = queryStr.toLowerCase().split(/\s+/).filter(Boolean)
      const tagFilters = words.map((w) => {
        const tag = w.startsWith("#") ? w : `#${w}`
        return where("tags", "array-contains", tag)
      })
      if (tagFilters.length > 0) {
        q = query(q, or(...tagFilters))
      }
    }

    const snap = await getDocs(q)
    let results = snap.docs.map((d) => mapPost(d.id, d.data()))

    if (queryStr) {
      const lower = queryStr.toLowerCase()
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.body.toLowerCase().includes(lower) ||
          p.author.name.toLowerCase().includes(lower) ||
          p.tags.some((t) => t.toLowerCase().includes(lower)),
      )
    }

    switch (sort) {
      case "hot":
        results.sort((a, b) => b.upvotes + b.commentCount * 2 - (a.upvotes + a.commentCount * 2))
        break
      case "new":
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "top":
        results.sort((a, b) => b.upvotes - a.upvotes)
        break
    }

    const total = results.length
    const start = (page - 1) * pageSize
    return { posts: results.slice(start, start + pageSize), total }
  } catch {
    return { posts: [], total: 0 }
  }
}

// ========== Stats ==========

export async function getForumStats(): Promise<{
  totalPosts: number
  totalComments: number
  totalVotes: number
  categoryCounts: { name: string; count: number }[]
  topPosts: { id: string; title: string; upvotes: number }[]
}> {
  if (!db) return { totalPosts: 0, totalComments: 0, totalVotes: 0, categoryCounts: [], topPosts: [] }
  try {
    const [postsSnap, votesSnap, catsSnap] = await Promise.all([
      getDocs(collection(db, POSTS_COL)),
      getDocs(collection(db, VOTES_COL)),
      getDocs(collection(db, CATEGORIES_COL)),
    ])

    const posts = postsSnap.docs.map((d) => mapPost(d.id, d.data()))
    const totalPosts = posts.length
    const totalVotes = votesSnap.size
    const totalComments = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0)

    const categoryCounts = catsSnap.docs.map((d) => ({
      name: d.data().name as string,
      count: (d.data().postCount as number) || 0,
    }))

    const topPosts = posts
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 10)
      .map((p) => ({ id: p.id, title: p.title, upvotes: p.upvotes }))

    return { totalPosts, totalComments, totalVotes, categoryCounts, topPosts }
  } catch {
    return { totalPosts: 0, totalComments: 0, totalVotes: 0, categoryCounts: [], topPosts: [] }
  }
}

// ========== Helpers ==========

function mapPost(id: string, data: Record<string, unknown>): ForumPost {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : (data.createdAt as string) || new Date().toISOString()
  const updatedAt = data.updatedAt instanceof Timestamp
    ? data.updatedAt.toDate().toISOString()
    : (data.updatedAt as string) || createdAt

  return {
    id,
    slug: (data.slug as string) || id,
    title: (data.title as string) || "",
    body: (data.body as string) || "",
    author: (data.author as ForumAuthor) || { uid: "", name: "Unknown", avatar: "?", role: "member", verified: false },
    categoryId: (data.categoryId as string) || "",
    tags: (data.tags as string[]) || [],
    media: (data.media as ForumPost["media"]) || [],
    metrics: (data.metrics as ForumPost["metrics"]) || [],
    featured: (data.featured as boolean) || false,
    pinned: (data.pinned as boolean) || false,
    verifiedResult: (data.verifiedResult as boolean) || false,
    upvotes: (data.upvotes as number) || 0,
    commentCount: (data.commentCount as number) || 0,
    createdAt,
    updatedAt,
    status: (data.status as PostStatus) || "published",
  }
}

function toFirestore(post: Partial<ForumPost>): Record<string, unknown> {
  const data: Record<string, unknown> = { ...post }
  if (post.createdAt) data.createdAt = Timestamp.fromDate(new Date(post.createdAt))
  if (post.updatedAt) data.updatedAt = Timestamp.fromDate(new Date(post.updatedAt))
  return data
}
