"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Link, Plus, ChevronDown, Upload, Sparkles, BadgeCheck, TrendingUp, FileText,
} from "lucide-react"
import type { ForumMedia, ForumMetric, ForumPost, ForumAuthor } from "../../data/forumStore"
import { createForumPost } from "../../data/forumService"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser, type UserProfile } from "../../data/feedbackStore"
import toast from "react-hot-toast"

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
  onPostCreated?: (post: ForumPost) => void
}

export default function CreatePostModal({ open, onClose, onPostCreated }: CreatePostModalProps) {
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = supabaseUser || localUser

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [categoryId, setCategoryId] = useState("web-apps")
  const [tagsInput, setTagsInput] = useState("")
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [metrics, setMetrics] = useState<ForumMetric[]>([])
  const [showMetrics, setShowMetrics] = useState(false)
  const [newMetricLabel, setNewMetricLabel] = useState("")
  const [newMetricValue, setNewMetricValue] = useState("")
  const [isTestimonial, setIsTestimonial] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState<ForumMedia[]>([])
  const [embedUrl, setEmbedUrl] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const channelOptions: { id: string; name: string }[] = [
    { id: "web-apps", name: "Web Apps" },
    { id: "landing-pages", name: "Landing Pages" },
    { id: "saas", name: "SaaS" },
    { id: "results", name: "Results" },
    { id: "testimonials", name: "Testimonials" },
  ]

  const reset = useCallback(() => {
    setTitle("")
    setBody("")
    setCategoryId("web-apps")
    setTagsInput("")
    setMetrics([])
    setShowMetrics(false)
    setIsTestimonial(false)
    setRating(5)
    setCompany("")
    setIsVerified(false)
    setUploadedMedia([])
    setEmbedUrl("")
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return
    if (!currentUser) { toast.error("Login to create a post"); return }

    setSubmitting(true)

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    const profile = currentUser as unknown as UserProfile
    const uid = profile.uid || currentUser.id || ""
    const author: ForumAuthor = {
      uid,
      name: profile.name || currentUser.email?.split("@")[0] || "User",
      avatar: (profile.name?.[0] || "U").toUpperCase(),
      role: profile.role === "admin" ? "admin" : "member",
      verified: profile.role === "admin",
      company: profile.company,
      photoUrl: profile.photoUrl,
    }

    const newPost: Omit<ForumPost, "id" | "upvotes" | "commentCount"> = {
      slug,
      title: title.trim(),
      body: body.trim(),
      author,
      categoryId,
      tags,
      media: uploadedMedia,
      metrics: metrics.length > 0 ? metrics : [],
      featured: false,
      pinned: false,
      verifiedResult: isVerified,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "published",
    }

    const firestoreId = await createForumPost(newPost)
    if (firestoreId) {
      toast.success("Post created!")
      onPostCreated?.({ ...newPost, id: firestoreId, upvotes: 0, commentCount: 0 } as ForumPost)
      handleClose()
    } else {
      toast.error("Failed to create post. Try again.")
    }
    setSubmitting(false)
  }

  const handleFiles = (files: File[]) => {
    setIsUploading(true)
    const validTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm", "video/quicktime"]
    const valid = files.filter((f) => validTypes.includes(f.type))
    const media: ForumMedia[] = valid.map((f) => ({
      type: f.type.startsWith("video/") ? "video" : "image",
      url: URL.createObjectURL(f),
    }))
    setUploadedMedia((prev) => [...prev, ...media])
    setIsUploading(false)
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleEmbed = () => {
    if (!embedUrl.trim()) return
    setUploadedMedia((prev) => [...prev, { type: "embed", url: embedUrl.trim() }])
    setEmbedUrl("")
  }

  const addMetric = () => {
    if (!newMetricLabel.trim() || !newMetricValue.trim()) return
    setMetrics((prev) => [...prev, { label: newMetricLabel.trim(), value: newMetricValue.trim() }])
    setNewMetricLabel("")
    setNewMetricValue("")
  }

  const removeMetric = (i: number) => {
    setMetrics((prev) => prev.filter((_, idx) => idx !== i))
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-12 pb-12 overflow-y-auto"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-2xl bg-[#111118] border border-[#1E1E2A] rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A]">
              <h2 className="text-lg font-bold text-[#F0F0F5]">Create Post</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-[#6B6B80] hover:text-[#F0F0F5] transition-all"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pt-4 pb-2">
              <div className="rounded-2xl bg-gradient-to-br from-[#4F6EF7]/5 via-transparent to-[#22C55E]/5 border border-[#1E1E2A] p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#F0F0F5] mb-3">
                  <Sparkles size={16} className="text-[#4F6EF7]" />
                  Tips for an amazing post
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#6B6B80]">
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="mt-0.5 text-[#4F6EF7]" />
                    <span>Describe the problem and your approach clearly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp size={14} className="mt-0.5 text-[#22C55E]" />
                    <span>Add real metrics — numbers tell the story</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Upload size={14} className="mt-0.5 text-[#F59E0B]" />
                    <span>Upload before/after screenshots or video demos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BadgeCheck size={14} className="mt-0.5 text-[#4F6EF7]" />
                    <span>Use tags like #SaaS, #NextJS for discoverability</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-base font-semibold text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  aria-label="Post title"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#6B6B80]">{title.length}/120</span>
              </div>

              <textarea
                placeholder="Write your post content... (markdown supported)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all resize-none"
                aria-label="Post body"
              />

              <div className="relative">
                <button
                  onClick={() => setShowChannelPicker(!showChannelPicker)}
                  className="w-full flex items-center justify-between bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] hover:border-[#4F6EF7]/50 transition-all"
                >
                  <span>Category: <span className="text-[#4F6EF7] font-medium">{channelOptions.find((c) => c.id === categoryId)?.name}</span></span>
                  <ChevronDown size={14} className={`text-[#6B6B80] transition-transform ${showChannelPicker ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showChannelPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-[#111118] border border-[#1E1E2A] rounded-xl overflow-hidden z-10 shadow-xl"
                    >
                      {channelOptions.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCategoryId(c.id); setShowChannelPicker(false) }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            categoryId === c.id ? "text-[#4F6EF7] bg-[#4F6EF7]/5" : "text-[#F0F0F5] hover:bg-white/[0.04]"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Tags (comma separated, e.g. #SaaS, #NextJS)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  aria-label="Tags"
                />
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
                  dragOver ? "border-[#4F6EF7] bg-[#4F6EF7]/5" : "border-[#1E1E2A] hover:border-[#4F6EF7]/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.mp4,.webm,.mov"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                />
                <Upload size={24} className={`mx-auto mb-2 ${dragOver ? "text-[#4F6EF7]" : "text-[#6B6B80]"}`} />
                <p className="text-sm text-[#6B6B80]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#4F6EF7] hover:text-[#6B85FF] transition-colors font-medium"
                  >
                    Click to upload
                  </button>{" "}
                  or drag and drop
                </p>
                <p className="text-[10px] text-[#6B6B80] mt-1">JPG, PNG, GIF, MP4, WebM up to 50MB</p>

                {isUploading && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#4F6EF7] border-t-transparent animate-spin" />
                    <span className="text-xs text-[#6B6B80]">Uploading...</span>
                  </div>
                )}

                {uploadedMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {uploadedMedia.map((m, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl bg-[#0A0A0F] border border-[#1E1E2A] overflow-hidden group">
                        {m.type === "image" ? (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        ) : m.type === "video" ? (
                          <div className="w-full h-full flex items-center justify-center text-[#6B6B80] text-xs">▶</div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6B6B80] text-xs">🔗</div>
                        )}
                        <button
                          onClick={() => setUploadedMedia((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={8} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste YouTube/Vimeo/Loom URL..."
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  className="flex-1 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  aria-label="Embed URL"
                />
                <button
                  onClick={handleEmbed}
                  disabled={!embedUrl.trim()}
                  className="bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  <Link size={16} />
                </button>
              </div>

              <div>
                <button
                  onClick={() => setShowMetrics(!showMetrics)}
                  className="flex items-center gap-2 text-sm text-[#6B6B80] hover:text-[#F0F0F5] transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Result Metrics</span>
                </button>
                <AnimatePresence>
                  {showMetrics && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Label (e.g. Conversion Rate)"
                            value={newMetricLabel}
                            onChange={(e) => setNewMetricLabel(e.target.value)}
                            className="flex-1 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-3 py-2 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. +34%)"
                            value={newMetricValue}
                            onChange={(e) => setNewMetricValue(e.target.value)}
                            className="w-28 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-3 py-2 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                          />
                          <button
                            onClick={addMetric}
                            disabled={!newMetricLabel.trim() || !newMetricValue.trim()}
                            className="px-3 py-2 bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {metrics.map((m, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#0A0A0F] rounded-xl px-3 py-2 border border-[#1E1E2A]">
                            <span className="text-xs text-[#6B6B80]">{m.label}: <span className="text-[#22C55E] font-bold">{m.value}</span></span>
                            <button onClick={() => removeMetric(i)} className="text-[#6B6B80] hover:text-red-400 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isTestimonial}
                  onChange={(e) => setIsTestimonial(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1E1E2A] bg-[#0A0A0F] text-[#4F6EF7] focus:ring-[#4F6EF7]/30 focus:ring-offset-0"
                />
                <span className="text-sm text-[#F0F0F5] group-hover:text-[#4F6EF7] transition-colors">This is a testimonial</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1E1E2A] bg-[#0A0A0F] text-[#4F6EF7] focus:ring-[#4F6EF7]/30 focus:ring-offset-0"
                />
                <span className="text-sm text-[#F0F0F5]">Mark as Verified Result <span className="text-[10px] text-[#6B6B80]">(admin only)</span></span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1E1E2A] bg-[#0A0A0F]/50">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSubmit}
                whileHover={canSubmit ? { scale: 1.03 } : {}}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                disabled={!canSubmit}
                className="bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(79,110,247,0.3)]"
                aria-label="Publish post"
              >
                {submitting ? "Publishing..." : "Publish Post"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
