import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import {
  Plus, Edit3, Trash2, Archive, Pin, Star,
  BadgeCheck, Search, Loader2, XCircle,
} from "lucide-react"
import type { ForumPost, ForumCategory, ForumMetric } from "../../data/forumStore"
import {
  fetchForumPosts, fetchCategories,
  updateForumPost, deleteForumPost, createCategory, updateCategory, deleteCategory,
  getForumStats,
} from "../../data/forumService"

interface EditPostModalProps {
  post: ForumPost | null
  categories: ForumCategory[]
  onClose: () => void
  onSaved: () => void
}

function EditPostModal({ post, categories, onClose, onSaved }: EditPostModalProps) {
  const [title, setTitle] = useState(post?.title || "")
  const [body, setBody] = useState(post?.body || "")
  const [categoryId, setCategoryId] = useState(post?.categoryId || "")
  const [status, setStatus] = useState<"published" | "draft" | "archived">(post?.status as "published" | "draft" | "archived" || "published")
  const [featured, setFeatured] = useState(post?.featured || false)
  const [pinned, setPinned] = useState(post?.pinned || false)
  const [verifiedResult, setVerifiedResult] = useState(post?.verifiedResult || false)
  const [tagsInput, setTagsInput] = useState(post?.tags.join(", ") || "")
  const [metrics, setMetrics] = useState<ForumMetric[]>(post?.metrics || [])
  const [saving, setSaving] = useState(false)

  if (!post) return null

  const handleSave = async () => {
    setSaving(true)
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean).map((t) => t.startsWith("#") ? t : `#${t}`)
    await updateForumPost(post.id, {
      title: title.trim(),
      body: body.trim(),
      categoryId,
      status: status as "published" | "draft" | "archived",
      featured,
      pinned,
      verifiedResult,
      tags,
      metrics,
    })
    toast.success("Post updated!")
    setSaving(false)
    onSaved()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="relative w-full max-w-2xl bg-[#111118] border border-[#1E1E2A] rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[#F0F0F5] mb-4">Edit Post</h2>
        <div className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50" placeholder="Title" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50 resize-none" placeholder="Body" />

          <div className="grid grid-cols-2 gap-3">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as "published" | "draft" | "archived")} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50" placeholder="Tags (comma separated)" />

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-4 h-4 rounded border-[#1E1E2A] bg-[#0A0A0F] text-[#4F6EF7]" />
              <span className="text-sm text-[#F0F0F5]">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4 rounded border-[#1E1E2A] bg-[#0A0A0F] text-[#4F6EF7]" />
              <span className="text-sm text-[#F0F0F5]">Pinned</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={verifiedResult} onChange={(e) => setVerifiedResult(e.target.checked)} className="w-4 h-4 rounded border-[#1E1E2A] bg-[#0A0A0F] text-[#4F6EF7]" />
              <span className="text-sm text-[#F0F0F5]">Verified Result</span>
            </label>
          </div>

          {/* Metrics editor */}
          <div>
            <p className="text-sm text-[#6B6B80] mb-2">Metrics</p>
            {metrics.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={m.label} onChange={(e) => { const m2 = [...metrics]; m2[i] = { ...m2[i], label: e.target.value }; setMetrics(m2) }} className="flex-1 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-1.5 text-xs text-[#F0F0F5]" />
                <input value={m.value} onChange={(e) => { const m2 = [...metrics]; m2[i] = { ...m2[i], value: e.target.value }; setMetrics(m2) }} className="w-24 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-1.5 text-xs text-[#F0F0F5]" />
                <button onClick={() => setMetrics(metrics.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><XCircle size={16} /></button>
              </div>
            ))}
            <button
              onClick={() => setMetrics([...metrics, { label: "", value: "" }])}
              className="text-xs text-[#4F6EF7] hover:text-[#6B85FF]"
            >
              + Add metric
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04] transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ===== Category Modal =====
interface CategoryModalProps {
  category: ForumCategory | null
  onClose: () => void
  onSaved: () => void
}

function CategoryModal({ category, onClose, onSaved }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || "")
  const [slug, setSlug] = useState(category?.slug || "")
  const [description, setDescription] = useState(category?.description || "")
  const [icon, setIcon] = useState(category?.icon || "Layout")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    if (category) {
      await updateCategory(category.id, { name: name.trim(), slug: slug.trim(), description: description.trim(), icon })
    } else {
      await createCategory({ name: name.trim(), slug: slug.trim(), description: description.trim(), icon })
    }
    toast.success(category ? "Category updated!" : "Category created!")
    setSaving(false)
    onSaved()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="relative w-full max-w-md bg-[#111118] border border-[#1E1E2A] rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[#F0F0F5] mb-4">{category ? "Edit Category" : "Create Category"}</h2>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5]" placeholder="Name" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5]" placeholder="Slug" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5]" placeholder="Description" />
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5]">
            <option value="Layout">Layout</option>
            <option value="FileText">FileText</option>
            <option value="Cloud">Cloud</option>
            <option value="TrendingUp">TrendingUp</option>
            <option value="Star">Star</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04]">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()} className="bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ===== Main Page =====
export default function ForumManagement() {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [stats, setStats] = useState({ totalPosts: 0, totalComments: 0, totalVotes: 0, categoryCounts: [] as { name: string; count: number }[], topPosts: [] as { id: string; title: string; upvotes: number }[] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editPost, setEditPost] = useState<ForumPost | null>(null)
  const [editCategory, setEditCategory] = useState<ForumCategory | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [tab, setTab] = useState<"posts" | "categories" | "stats">("posts")

  const loadData = async () => {
    setLoading(true)
    const [p, c, s] = await Promise.all([
      fetchForumPosts(200),
      fetchCategories(),
      getForumStats(),
    ])
    setPosts(p)
    setCategories(c)
    setStats(s)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [])

  const filteredPosts = posts.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDelete = async (post: ForumPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    await deleteForumPost(post.id, post.categoryId)
    toast.success("Post deleted")
    loadData()
  }

  const handleArchive = async (post: ForumPost) => {
    await updateForumPost(post.id, { status: post.status === "archived" ? "published" : "archived" })
    toast.success(post.status === "archived" ? "Post restored" : "Post archived")
    loadData()
  }

  const handleDeleteCategory = async (cat: ForumCategory) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return
    await deleteCategory(cat.id)
    toast.success("Category deleted")
    loadData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F0F0F5]">Forum Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewCategory(true)}
            className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[#F0F0F5] px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus size={16} /> New Category
          </button>
          <button
            onClick={() => setTab("posts")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "posts" ? "bg-[#4F6EF7] text-white" : "bg-white/[0.04] text-[#6B6B80] hover:text-[#F0F0F5]"}`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "categories" ? "bg-[#4F6EF7] text-white" : "bg-white/[0.04] text-[#6B6B80] hover:text-[#F0F0F5]"}`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "stats" ? "bg-[#4F6EF7] text-white" : "bg-white/[0.04] text-[#6B6B80] hover:text-[#F0F0F5]"}`}
          >
            Stats
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
        </div>
      ) : tab === "stats" ? (
        /* Stats Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-5">
            <p className="text-3xl font-bold text-[#F0F0F5]">{stats.totalPosts}</p>
            <p className="text-xs text-[#6B6B80] mt-1">Total Posts</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-5">
            <p className="text-3xl font-bold text-[#F0F0F5]">{stats.totalComments}</p>
            <p className="text-xs text-[#6B6B80] mt-1">Total Comments</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-5">
            <p className="text-3xl font-bold text-[#F0F0F5]">{stats.totalVotes}</p>
            <p className="text-xs text-[#6B6B80] mt-1">Total Votes</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-5">
            <p className="text-3xl font-bold text-[#F0F0F5]">{posts.filter((p) => p.verifiedResult).length}</p>
            <p className="text-xs text-[#6B6B80] mt-1">Verified Results</p>
          </div>

          {/* Category breakdown */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">Posts by Category</h3>
            <div className="space-y-2">
              {stats.categoryCounts.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-sm text-[#6B6B80]">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#4F6EF7]"
                        style={{ width: `${stats.totalPosts > 0 ? (c.count / stats.totalPosts) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#F0F0F5] tabular-nums w-6 text-right">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top posts */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-[#F0F0F5] mb-3">Top Posts by Upvotes</h3>
            <div className="space-y-2">
              {stats.topPosts.slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm text-[#6B6B80] truncate flex-1">
                    <span className="text-[10px] text-[#4F6EF7] mr-2">#{i + 1}</span>
                    {p.title}
                  </span>
                  <span className="text-xs text-[#F0F0F5] tabular-nums ml-4">{p.upvotes} votes</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : tab === "categories" ? (
        /* Categories Tab */
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-4">
              <div>
                <span className="text-sm font-semibold text-[#F0F0F5]">{cat.name}</span>
                <span className="text-xs text-[#6B6B80] ml-2">{cat.slug}</span>
                <span className="text-xs text-[#6B6B80] ml-2">{cat.postCount} posts</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditCategory(cat)} className="p-2 text-[#6B6B80] hover:text-[#4F6EF7] transition-colors"><Edit3 size={14} /></button>
                <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-[#6B6B80] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Posts Tab */
        <>
          <div className="relative mb-4 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80]" />
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            {filteredPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.pinned && <Pin size={12} className="text-[#F59E0B]" />}
                    {post.featured && <Star size={12} className="text-[#8B5CF6]" />}
                    {post.verifiedResult && <BadgeCheck size={12} className="text-[#22C55E]" />}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      post.status === "published" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                      post.status === "draft" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                      "bg-[#6B6B80]/10 text-[#6B6B80]"
                    }`}>
                      {post.status}
                    </span>
                    <span className="text-[10px] text-[#6B6B80]">{post.categoryId}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#F0F0F5] truncate">{post.title}</p>
                  <p className="text-xs text-[#6B6B80]">
                    {post.author.name} · {post.upvotes} votes · {post.commentCount} comments
                  </p>
                </div>
                <div className="flex gap-1 ml-4 shrink-0">
                  <button onClick={() => setEditPost(post)} className="p-2 text-[#6B6B80] hover:text-[#4F6EF7] transition-colors" title="Edit"><Edit3 size={14} /></button>
                  <button onClick={() => handleArchive(post)} className="p-2 text-[#6B6B80] hover:text-[#F59E0B] transition-colors" title={post.status === "archived" ? "Restore" : "Archive"}><Archive size={14} /></button>
                  <button onClick={() => handleDelete(post)} className="p-2 text-[#6B6B80] hover:text-red-400 transition-colors" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {editPost && (
          <EditPostModal post={editPost} categories={categories} onClose={() => setEditPost(null)} onSaved={() => { setEditPost(null); loadData() }} />
        )}
        {editCategory && (
          <CategoryModal category={editCategory} onClose={() => setEditCategory(null)} onSaved={() => { setEditCategory(null); loadData() }} />
        )}
        {showNewCategory && (
          <CategoryModal category={null} onClose={() => setShowNewCategory(false)} onSaved={() => { setShowNewCategory(false); loadData() }} />
        )}
      </AnimatePresence>
    </div>
  )
}
