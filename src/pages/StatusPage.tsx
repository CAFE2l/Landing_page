import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useIsMobile } from "../hooks/useMobile"
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserRound,
  X,
} from "lucide-react"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import PageShell from "./PageShell"
import UserAvatar from "../components/ui/UserAvatar"
import { useAuth } from "../contexts/AuthContext"
import type { SocialPost, SocialStatusCategory } from "../data/feedbackStore"
import { uploadChatMedia } from "../lib/chatService"
import { createOrGetConversation } from "../lib/chatService"
import { sendMessage } from "../lib/chatService"
import {
  createSocialPost,
  deleteSocialPost,
  fetchFollowCounts,
  fetchSocialPosts,
  isFollowing,
  recordSocialPostView,
  toggleFollow,
  toggleSocialLike,
  toggleSocialSave,
  fetchPostComments,
  addPostComment,
} from "../lib/socialService"
import { cn, timeAgo } from "../lib/utils"

const MAX_STATUS_CHARS = 700
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const STORY_DURATION_SEC = 5

type CategoryId = SocialStatusCategory

const CATEGORY_META: Record<
  CategoryId,
  { name: string; short: string; color: string; ring: string; glow: string; icon: typeof Sparkles; bgGlow: string }
> = {
  business: {
    name: "Business",
    short: "Business",
    color: "border-sky-400/25 bg-sky-400/10 text-sky-200",
    ring: "from-sky-400 via-blue-500 to-cyan-300",
    glow: "shadow-[0_0_34px_rgba(56,189,248,0.18)]",
    icon: BriefcaseBusiness,
    bgGlow: "bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.12),transparent_70%)]",
  },
  project: {
    name: "Project",
    short: "Project",
    color: "border-violet-400/25 bg-violet-400/10 text-violet-200",
    ring: "from-violet-400 via-fuchsia-500 to-blue-400",
    glow: "shadow-[0_0_34px_rgba(139,92,246,0.18)]",
    icon: Target,
    bgGlow: "bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_70%)]",
  },
  study: {
    name: "Study",
    short: "Study",
    color: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    ring: "from-emerald-300 via-teal-500 to-sky-400",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.16)]",
    icon: BookOpen,
    bgGlow: "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)]",
  },
  lifestyle: {
    name: "Lifestyle",
    short: "Lifestyle",
    color: "border-orange-300/25 bg-orange-300/10 text-orange-100",
    ring: "from-orange-300 via-rose-400 to-amber-300",
    glow: "shadow-[0_0_34px_rgba(251,146,60,0.16)]",
    icon: UserRound,
    bgGlow: "bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.12),transparent_70%)]",
  },
  win: {
    name: "Win",
    short: "Win",
    color: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    ring: "from-amber-200 via-yellow-400 to-orange-300",
    glow: "shadow-[0_0_34px_rgba(251,191,36,0.16)]",
    icon: Trophy,
    bgGlow: "bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.12),transparent_70%)]",
  },
  behind_the_scenes: {
    name: "Behind The Scenes",
    short: "BTS",
    color: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    ring: "from-slate-200 via-cyan-400 to-blue-500",
    glow: "shadow-[0_0_34px_rgba(148,163,184,0.16)]",
    icon: Camera,
    bgGlow: "bg-[radial-gradient(ellipse_at_center,rgba(148,163,184,0.10),transparent_70%)]",
  },
}

const CATEGORIES = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id: id as CategoryId, ...meta }))

interface StoryFormState {
  content: string
  category: CategoryId
  image: { url: string; type: "image" } | null
}

interface StoryGroup {
  userId: string
  name: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  role: string | null
  category: CategoryId
  posts: SocialPost[]
  followers: number | null
  following: number | null
  followedByMe: boolean
}

const DEFAULT_FORM: StoryFormState = {
  content: "",
  category: "project",
  image: null,
}

function validateStory(form: StoryFormState) {
  const content = form.content.trim()
  if (!content && !form.image) return "Write something or add an image."
  if (content.length > MAX_STATUS_CHARS) return `Must be ${MAX_STATUS_CHARS} characters or less.`
  if (!CATEGORY_META[form.category]) return "Choose a valid category."
  return null
}

function groupStories(posts: SocialPost[], followState: Map<string, boolean>, counts: Map<string, { followers: number; following: number }>): StoryGroup[] {
  const groups = new Map<string, StoryGroup>()
  for (const post of posts) {
    const existing = groups.get(post.userId)
    if (existing) {
      existing.posts.push(post)
      existing.category = post.category
      continue
    }
    const fc = counts.get(post.userId)
    groups.set(post.userId, {
      userId: post.userId,
      name: post.user?.name || "User unavailable",
      username: post.user?.username || null,
      avatarUrl: post.user?.avatarUrl || null,
      bio: post.user?.bio || null,
      role: post.user?.role || null,
      category: post.category,
      posts: [post],
      followers: fc?.followers ?? null,
      following: fc?.following ?? null,
      followedByMe: followState.get(post.userId) || false,
    })
  }
  return [...groups.values()].sort((a, b) => {
    const aTime = new Date(a.posts[0]?.createdAt || 0).getTime()
    const bTime = new Date(b.posts[0]?.createdAt || 0).getTime()
    return bTime - aTime
  })
}

// ========== CategoryBadge ==========

function CategoryBadge({ category }: { category: CategoryId }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.business
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", meta.color)}>
      <Icon size={12} />
      {meta.name}
    </span>
  )
}

// ========== StoryAvatar ==========

function StoryAvatar({
  group,
  active,
  viewed,
  onClick,
}: {
  group: StoryGroup
  active: boolean
  viewed: boolean
  onClick: () => void
}) {
  const meta = CATEGORY_META[group.category] || CATEGORY_META.business
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  return (
    <motion.button
      type="button"
      whileHover={isMobile ? undefined : { y: -3 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="group grid w-[76px] shrink-0 grid-rows-[72px_auto_auto] place-items-center overflow-hidden text-center sm:w-[84px] sm:grid-rows-[78px_auto_auto]"
    >
      <span
        className={cn(
          "relative flex h-[68px] w-[68px] items-center justify-center rounded-full transition duration-300 sm:h-[72px] sm:w-[72px]",
          active && !viewed ? meta.glow : "",
        )}
      >
        <span
          className={cn(
            "flex h-[64px] w-[64px] items-center justify-center rounded-full p-[2px] sm:h-[68px] sm:w-[68px]",
            viewed
              ? "bg-white/[0.14]"
              : "bg-gradient-to-br shadow-[0_0_18px_rgba(79,70,229,0.22)]",
            viewed ? "" : meta.ring,
          )}
        >
          <span className={cn("flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#020408] p-[3px] sm:h-[62px] sm:w-[62px]", viewed ? "opacity-70" : "")}>
            <UserAvatar
              user={{ name: group.name, avatarUrl: group.avatarUrl }}
              size="lg"
              className="h-full w-full"
              ring={false}
            />
          </span>
        </span>
        {active && !viewed && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className={cn("pointer-events-none absolute inset-[4px] rounded-full bg-gradient-to-br opacity-40 blur-md", meta.ring)}
          />
        )}
      </span>
      <span className={cn("mt-1 block w-full truncate px-1 text-[11px] font-semibold leading-tight transition sm:text-xs", viewed ? "text-white/40" : "text-white/80 group-hover:text-white")}>
        {group.name}
      </span>
      <span className="mt-0.5 block w-full truncate px-1 text-[9px] leading-tight text-white/36 sm:text-[10px]">{meta.short}</span>
    </motion.button>
  )
}

// ========== StoryBar ==========

function StoryBar({
  loading,
  groups,
  selectedId,
  signedIn,
  viewedSet,
  onCreate,
  onOpenGroup,
}: {
  loading: boolean
  groups: StoryGroup[]
  selectedId?: string
  signedIn: boolean
  viewedSet: Set<string>
  onCreate: () => void
  onOpenGroup: (group: StoryGroup) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [groups, checkScroll])

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" })
  }

  const placeholderCount = 6

  return (
    <div className="relative inline-flex max-w-full overflow-hidden rounded-[24px] border border-white/[0.10] bg-[#050914]/80 px-3 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:rounded-[28px] sm:px-4 sm:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(79,110,247,0.08)_45%,rgba(255,255,255,0.03))]" />
      <AnimatePresence>
        {canScrollLeft ? (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-black/72 text-white/78 shadow-lg backdrop-blur-md transition hover:bg-black/90 hover:text-white sm:flex"
          >
            <ChevronLeft size={16} />
          </motion.button>
        ) : null}
        {canScrollRight ? (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-black/72 text-white/78 shadow-lg backdrop-blur-md transition hover:bg-black/90 hover:text-white sm:flex"
          >
            <ChevronRight size={16} />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <div
        ref={scrollRef}
        className="relative z-[1] flex max-w-full gap-2 overflow-x-auto overflow-y-hidden scrollbar-none sm:gap-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <motion.button
          type="button"
          whileHover={isMobile ? undefined : { y: -3 }}
          whileTap={{ scale: 0.94 }}
          onClick={onCreate}
          disabled={!signedIn}
          className="group grid w-[76px] shrink-0 grid-rows-[72px_auto_auto] place-items-center overflow-hidden text-center disabled:cursor-not-allowed disabled:opacity-45 sm:w-[84px] sm:grid-rows-[78px_auto_auto]"
        >
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-dashed border-[#7EA1FF]/55 bg-[#4F6EF7]/12 p-[5px] text-[#B9C8FF] shadow-[0_0_24px_rgba(79,110,247,0.14)] transition group-hover:border-[#9bb3ff]/80 group-hover:bg-[#4F6EF7]/18 sm:h-[72px] sm:w-[72px]">
            <Plus size={22} />
          </span>
          <span className="mt-1 block w-full truncate px-1 text-[11px] font-semibold leading-tight text-white/80 sm:text-xs">Your Story</span>
          <span className="mt-0.5 block w-full truncate px-1 text-[9px] leading-tight text-white/36 sm:text-[10px]">tap</span>
        </motion.button>

        {loading
          ? Array.from({ length: placeholderCount }).map((_, i) => (
              <div key={i} className="grid w-[76px] shrink-0 grid-rows-[72px_auto_auto] place-items-center overflow-hidden text-center sm:w-[84px] sm:grid-rows-[78px_auto_auto]">
                <div className="h-[64px] w-[64px] animate-pulse rounded-full bg-white/[0.07] sm:h-[68px] sm:w-[68px]" />
                <div className="mx-auto mt-1 h-3 w-12 animate-pulse rounded bg-white/[0.06]" />
                <div className="mx-auto mt-0.5 h-2 w-8 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))
          : groups.map((group) => (
              <StoryAvatar
                key={group.userId}
                group={group}
                active={selectedId === group.userId}
                viewed={viewedSet.has(group.userId)}
                onClick={() => onOpenGroup(group)}
              />
            ))}
      </div>
    </div>
  )
}

// ========== CreateStoryModal (Step-based) ==========

function CreateStoryModal({
  open,
  userId,
  onClose,
  onSubmit,
}: {
  open: boolean
  userId?: string
  onClose: () => void
  onSubmit: (state: StoryFormState) => Promise<boolean>
}) {
  const [step, setStep] = useState(0)
  const modalIsMobile = useIsMobile()
  const [form, setForm] = useState<StoryFormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const error = validateStory(form)
  const remaining = MAX_STATUS_CHARS - form.content.length
  const totalSteps = 4

  useEffect(() => {
    if (!open) {
      setStep(0)
      setForm(DEFAULT_FORM)
      setSubmitting(false)
      setUploading(false)
    }
  }, [open])

  const update = <Key extends keyof StoryFormState>(key: Key, value: StoryFormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!userId) { toast.error("Login required."); return }
    if (!file.type.startsWith("image/")) { toast.error("Use a valid image."); return }
    if (file.size > MAX_IMAGE_SIZE) { toast.error("Image must be under 8MB."); return }
    setUploading(true)
    const result = await uploadChatMedia(file, userId)
    setUploading(false)
    if (!result || !result.mimeType.startsWith("image")) {
      toast.error("Could not upload this image.")
      return
    }
    update("image", { url: result.url, type: "image" })
  }

  const submit = async () => {
    const validation = validateStory(form)
    if (validation) { toast.error(validation); return }
    setSubmitting(true)
    const ok = await onSubmit(form)
    setSubmitting(false)
    if (ok) {
      setStep(totalSteps - 1)
      setTimeout(() => { onClose() }, 1400)
    }
  }

  const stepLabels = ["Category", "Content", "Preview", "Publish"]

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-2xl sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={modalIsMobile ? { opacity: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={modalIsMobile ? undefined : { opacity: 0, y: 20, scale: 0.96 }}
            transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="safe-bottom relative max-h-[94dvh] w-full max-w-2xl overflow-hidden rounded-t-[28px] border border-white/[0.11] bg-[#090a10]/96 shadow-[0_44px_130px_rgba(0,0,0,0.62)] sm:max-h-[92vh] sm:rounded-[32px]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_26%_0%,rgba(79,110,247,0.22),transparent_42%),radial-gradient(circle_at_82%_8%,rgba(139,92,246,0.14),transparent_36%)]" />

            {/* Step indicator */}
            <div className="relative flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-5">
              <div className="flex items-center gap-3">
                {stepLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <motion.div
                      animate={i === step ? { scale: 1.1 } : { scale: 1 }}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition",
                        i < step ? "bg-[#4F6EF7] text-white" : i === step ? "border-2 border-[#4F6EF7] bg-[#4F6EF7]/15 text-[#7EA1FF]" : "border border-white/[0.1] bg-white/[0.04] text-white/30",
                      )}
                    >
                      {i < step ? <CheckCircle2 size={14} /> : i + 1}
                    </motion.div>
                    <span className={cn("hidden text-xs font-semibold sm:block", i === step ? "text-white" : "text-white/30")}>{label}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="touch-target flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            {/* Step progress bar */}
            <div className="relative mx-4 mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06] sm:mx-6">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#4F6EF7] to-[#6D28D9]"
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>

            <div className="relative max-h-[78dvh] overflow-y-auto p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {/* Step 0: Category */}
                  {step === 0 ? (
                  <motion.div
                    key="step-category"
                    initial={modalIsMobile ? { opacity: 1 } : { opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={modalIsMobile ? undefined : { opacity: 0, x: -40 }}
                    transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 220, damping: 24 }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7EA1FF]">Step 1 of 4</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Choose a category</h2>
                    <p className="mt-1 text-sm text-white/46">Pick the category that best fits your story.</p>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {CATEGORIES.map((cat) => {
                        const selected = form.category === cat.id
                        const Icon = cat.icon
                        return (
                          <motion.button
                            key={cat.id}
                            type="button"
                            whileHover={modalIsMobile ? undefined : { y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => update("category", cat.id)}
                            className={cn(
                              "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                              selected
                                ? cat.color + " shadow-lg"
                                : "border-white/[0.08] bg-white/[0.035] text-white/48 hover:bg-white/[0.055] hover:text-white",
                            )}
                          >
                            {selected ? <div className={cn("absolute inset-0 opacity-20", cat.bgGlow)} /> : null}
                            <div className="relative flex flex-col items-center gap-2 text-center">
                              <span className={cn("rounded-full bg-gradient-to-br p-[3px]", cat.ring)}>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#090a10]">
                                  <Icon size={20} />
                                </span>
                              </span>
                              <span className="text-xs font-semibold">{cat.name}</span>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        Next <ArrowRight size={15} />
                      </button>
                    </div>
                  </motion.div>

                /* Step 1: Content */
                ) : step === 1 ? (
                  <motion.div
                    key="step-content"
                    initial={modalIsMobile ? { opacity: 1 } : { opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={modalIsMobile ? undefined : { opacity: 0, x: -40 }}
                    transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 220, damping: 24 }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7EA1FF]">Step 2 of 4</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Add your story content</h2>
                    <p className="mt-1 text-sm text-white/46">Share what you are building, learning or celebrating.</p>

                    <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-black/24 p-4">
                      <textarea
                        value={form.content}
                        onChange={(e) => update("content", e.target.value)}
                        placeholder="What's on your mind?"
                        rows={5}
                        className={cn(
                          "min-h-28 w-full resize-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-white/28",
                          remaining < 0 && "text-red-100",
                        )}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading || !userId}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 text-xs font-semibold text-white/66 transition hover:border-[#7EA1FF]/45 hover:bg-white/[0.065] hover:text-white disabled:opacity-40"
                        >
                          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                          {form.image ? "Change Image" : "Add Image"}
                        </button>
                        <span className={cn("text-xs", remaining < 0 ? "text-red-300" : remaining < 90 ? "text-amber-300" : "text-white/36")}>{remaining}</span>
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

                      {form.image ? (
                        <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                          <img src={form.image.url} alt="Preview" loading="lazy" decoding="async" className="max-h-[260px] w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => update("image", null)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/72 text-white transition hover:bg-red-500"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <button type="button" onClick={() => setStep(0)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.08] px-4 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                        <ChevronLeft size={15} /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={Boolean(error) && !form.content && !form.image}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-45"
                      >
                        Preview <ArrowRight size={15} />
                      </button>
                    </div>
                  </motion.div>

                /* Step 2: Preview */
                ) : step === 2 ? (
                  <motion.div
                    key="step-preview"
                    initial={modalIsMobile ? { opacity: 1 } : { opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={modalIsMobile ? undefined : { opacity: 0, x: -40 }}
                    transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 220, damping: 24 }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7EA1FF]">Step 3 of 4</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Preview your story</h2>
                    <p className="mt-1 text-sm text-white/46">This is how your story will appear.</p>

                    <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.12] bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.025))] shadow-[0_34px_110px_rgba(0,0,0,0.50)]">
                      {form.image ? (
                        <img src={form.image.url} alt="" loading="lazy" decoding="async" className="max-h-[400px] w-full object-cover" />
                      ) : null}
                      <div className={cn("p-6", form.image ? "border-t border-white/[0.08]" : "")}>
                        {form.content ? (
                          <p className="whitespace-pre-wrap text-lg font-semibold leading-relaxed text-white">{form.content}</p>
                        ) : (
                          <p className="text-lg text-white/36 italic">No text content</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-white/[0.08] bg-black/22 px-5 py-3 text-xs">
                        <CategoryBadge category={form.category} />
                        <span className="text-white/38">Just now</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <button type="button" onClick={() => setStep(1)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.08] px-4 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                        <ChevronLeft size={15} /> Back
                      </button>
                      <button
                        type="button"
                        onClick={submit}
                        disabled={submitting || Boolean(error)}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-45"
                      >
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        Publish Story
                      </button>
                    </div>
                  </motion.div>

                /* Step 3: Published Success */
                ) : (
                  <motion.div
                    key="step-publish"
                    initial={modalIsMobile ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 200, damping: 20 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                      transition={modalIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 200, delay: 0.1 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4F6EF7]/20"
                    >
                      <CheckCircle2 size={44} className="text-[#4F6EF7]" />
                    </motion.div>
                    <h2 className="mt-5 text-2xl font-semibold text-white">Story Published!</h2>
                    <p className="mt-2 text-sm text-white/48">Your story is now visible to the community.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// ========== StoryViewer ==========

function StoryViewer({
  group,
  currentUserId,
  isAdmin,
  onClose,
  onFollowChanged,
  onDeleteStatus,
}: {
  group: StoryGroup | null
  currentUserId?: string
  isAdmin: boolean
  onClose: () => void
  onFollowChanged: () => Promise<void>
  onDeleteStatus: (post: SocialPost) => Promise<void>
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [liking, setLiking] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [comments, setComments] = useState<Array<{ id: string; userId: string; content: string; createdAt: string; user: { name: string; avatarUrl: string | null } | null }>>([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [postingComment, setPostingComment] = useState(false)
  const navigate = useNavigate()
  const viewerIsMobile = useIsMobile()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const posts = group?.posts || []
  const activePost = posts[Math.min(activeIndex, Math.max(0, posts.length - 1))]
  const ownStory = currentUserId && group?.userId === currentUserId

  useEffect(() => {
    setActiveIndex(0)
    setProgress(0)
    setPaused(false)
    setComments([])
    setShowComments(false)
  }, [group?.userId])

  useEffect(() => {
    if (!activePost || posts.length === 0) return
    if (currentUserId && activePost && currentUserId !== activePost.userId) {
      recordSocialPostView(activePost.id, currentUserId)
    }
  }, [activePost?.id, currentUserId])

  useEffect(() => {
    if (paused || posts.length === 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    const fps = 30
    const interval = 1000 / fps
    const increment = 100 / (STORY_DURATION_SEC * fps)
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment
        if (next >= 100) {
          if (activeIndex < posts.length - 1) {
            setActiveIndex((i) => i + 1)
            return 0
          }
          return 100
        }
        return next
      })
    }, interval)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeIndex, paused, posts.length])

  const goPrev = () => {
    if (activeIndex > 0) { setActiveIndex((i) => i - 1); setProgress(0) }
  }
  const goNext = () => {
    if (activeIndex < posts.length - 1) { setActiveIndex((i) => i + 1); setProgress(0) }
  }

  const handleFollow = async () => {
    if (!group || !currentUserId || currentUserId === group.userId) return
    setBusyFollow(true)
    const ok = await toggleFollow(currentUserId, group.userId)
    setBusyFollow(false)
    if (!ok) { toast.error("Could not update follow."); return }
    await onFollowChanged()
  }

  const handleDeleteActive = async () => {
    if (!activePost) return
    if (!window.confirm("Delete this story?")) return
    setDeleting(true)
    await onDeleteStatus(activePost)
    setDeleting(false)
    if (posts.length <= 1) { onClose(); return }
    setActiveIndex((i) => Math.max(0, Math.min(i, posts.length - 2)))
  }

  const handleLike = async () => {
    if (!activePost || !currentUserId) { toast.error("Login to like."); return }
    setLiking(activePost.id)
    const ok = await toggleSocialLike(activePost.id, currentUserId)
    setLiking(null)
    if (!ok) toast.error("Could not update like.")
  }

  const handleSave = async () => {
    if (!activePost || !currentUserId) { toast.error("Login to save."); return }
    setSaving(activePost.id)
    const ok = await toggleSocialSave(activePost.id, currentUserId)
    setSaving(null)
    if (!ok) toast.error("Could not save.")
  }

  const handleShare = async () => {
    if (!activePost) return
    const url = `${window.location.origin}/dashboard/status?story=${activePost.id}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success("Story link copied!")
    }
  }

  const loadComments = async (postId: string) => {
    const data = await fetchPostComments(postId)
    setComments(data)
    setShowComments(true)
  }

  const handlePostComment = async () => {
    if (!activePost || !currentUserId || !commentText.trim()) return
    setPostingComment(true)
    const newComment = await addPostComment(activePost.id, currentUserId, commentText.trim())
    setPostingComment(false)
    if (newComment) {
      setComments((prev) => [...prev, newComment])
      setCommentText("")
    } else {
      toast.error("Could not post comment.")
    }
  }

  const handleQuickReply = async () => {
    if (!group || !currentUserId || !replyText.trim() || group.userId === currentUserId) return
    setSendingReply(true)
    const convId = await createOrGetConversation(currentUserId, group.userId)
    if (!convId) { toast.error("Could not open conversation."); setSendingReply(false); return }
    const sent = await sendMessage(convId, currentUserId, group.userId, replyText.trim())
    setSendingReply(false)
    if (sent) {
      toast.success("Reply sent!")
      setReplyText("")
      navigate(`/dashboard/messages?conversation=${convId}`)
    } else {
      toast.error("Could not send reply.")
    }
  }

  return (
    <AnimatePresence>
      {group ? (
        <motion.div
          key={group.userId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={onClose}
        >
          <motion.div
            key="viewer"
            initial={viewerIsMobile ? { opacity: 1 } : { opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={viewerIsMobile ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={viewerIsMobile ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 27 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full flex-col bg-black"
          >
            {/* Progress bars */}
            <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-2 pt-2 sm:px-4 sm:pt-4">
              {posts.map((post, index) => (
                <div key={post.id} className="flex-1 overflow-hidden rounded-full bg-white/25">
                  <motion.div
                    className="h-0.5 rounded-full bg-white"
                    initial={{ width: index < activeIndex ? "100%" : index === activeIndex ? "0%" : "0%" }}
                    animate={{ width: index < activeIndex ? "100%" : index === activeIndex ? `${progress}%` : "0%" }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              ))}
            </div>

            {/* Top overlay */}
            <div className="absolute inset-x-0 top-0 z-20 px-3 pt-6 sm:px-5 sm:pt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70">
                    <X size={16} />
                  </button>
                  <UserAvatar user={{ name: group.name, avatarUrl: group.avatarUrl }} size="sm" ring={false} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{group.name}</p>
                    <p className="truncate text-[11px] text-white/50">{activePost ? timeAgo(activePost.createdAt) : ""}</p>
                  </div>
                  {!ownStory && currentUserId ? (
                    <button
                      type="button"
                      onClick={handleFollow}
                      disabled={busyFollow}
                      className="ml-2 rounded-lg border border-white/[0.2] bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                    >
                      {busyFollow ? <Loader2 size={12} className="animate-spin" /> : group.followedByMe ? "Following" : "Follow"}
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && activePost ? (
                    <button type="button" onClick={handleDeleteActive} disabled={deleting} className="flex h-8 items-center gap-1 rounded-lg border border-red-400/20 bg-red-500/10 px-2 text-[11px] font-semibold text-red-200 backdrop-blur-sm transition hover:bg-red-500/20 disabled:opacity-50">
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Content area */}
            <div
              className="relative flex flex-1 items-center justify-center"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={() => setPaused(true)}
              onTouchEnd={() => setPaused(false)}
            >
              <AnimatePresence mode="wait">
                {activePost ? (
                  <motion.div
                    key={activePost.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-full w-full max-w-[520px] flex-col items-center justify-center"
                  >
                    {activePost.mediaUrl && activePost.mediaType === "image" ? (
                      <img src={activePost.mediaUrl} alt="" loading="lazy" decoding="async" className="max-h-full w-full object-contain" />
                    ) : activePost.mediaUrl && activePost.mediaType === "video" ? (
                      <video src={activePost.mediaUrl} controls preload="metadata" playsInline className="max-h-full w-full bg-black object-contain" />
                    ) : activePost.mediaUrl && activePost.mediaType === "audio" ? (
                      <div className="flex h-full w-full items-center justify-center bg-black/26 p-8">
                        <audio src={activePost.mediaUrl} controls className="w-full" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-8">
                        <p className="max-w-lg whitespace-pre-wrap text-center text-2xl font-semibold leading-relaxed text-white sm:text-3xl">{activePost.content}</p>
                      </div>
                    )}
                    {activePost.mediaUrl && activePost.content ? (
                      <div className="absolute bottom-20 left-4 right-4 rounded-xl bg-black/50 px-4 py-2.5 backdrop-blur-md">
                        <p className="text-sm leading-relaxed text-white/90">{activePost.content}</p>
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Tap zones */}
              <div className="absolute inset-0 z-10 flex">
                <div className="w-1/3" onClick={goPrev} />
                <div className="w-1/3" />
                <div className="w-1/3" onClick={goNext} />
              </div>

              {/* Desktop nav arrows */}
              <button type="button" onClick={goPrev} disabled={activeIndex === 0} className="absolute left-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-20 md:flex">
                <ChevronLeft size={20} />
              </button>
              <button type="button" onClick={goNext} disabled={activeIndex >= posts.length - 1} className="absolute right-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-20 md:flex">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Bottom actions */}
            <div className="relative z-20 border-t border-white/[0.06] bg-black/60 px-4 py-3 backdrop-blur-lg">
              {activePost ? (
                <div className="mx-auto flex max-w-[520px] items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={handleLike}
                      disabled={liking === activePost.id}
                      className={cn("inline-flex items-center gap-1.5 text-sm transition", activePost.liked ? "text-[#FF4B6E]" : "text-white/50 hover:text-white")}
                    >
                      {liking === activePost.id ? <Loader2 size={18} className="animate-spin" /> : <Heart size={20} className={activePost.liked ? "fill-current" : ""} />}
                      <span className="text-xs font-semibold">{activePost.likesCount}</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={() => loadComments(activePost.id)}
                      className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
                    >
                      <MessageCircle size={20} />
                      <span className="text-xs font-semibold">{activePost.commentsCount}</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={handleSave}
                      disabled={saving === activePost.id}
                      className={cn("inline-flex items-center gap-1.5 text-sm transition", activePost.saved ? "text-[#FFB800]" : "text-white/50 hover:text-white")}
                    >
                      {saving === activePost.id ? <Loader2 size={18} className="animate-spin" /> : <Bookmark size={20} className={activePost.saved ? "fill-current" : ""} />}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
                    >
                      <Share2 size={20} />
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Eye size={14} />
                    <span>{activePost.viewsCount}</span>
                  </div>
                </div>
              ) : null}

              {/* Comments section */}
              <AnimatePresence>
                {showComments ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-white/[0.06] pt-3 mt-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-white/60">Comments</p>
                      <button type="button" onClick={() => setShowComments(false)} className="text-xs text-white/30 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-32 space-y-2 overflow-y-auto">
                      {comments.length === 0 ? (
                        <p className="text-xs text-white/30 italic">No comments yet.</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2 rounded-lg bg-white/[0.04] p-2">
                            <UserAvatar user={{ name: c.user?.name || "?", avatarUrl: c.user?.avatarUrl }} size="sm" className="h-6 w-6 text-[9px]" ring={false} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white/70">{c.user?.name || "User"}</p>
                              <p className="text-xs text-white/50">{c.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {currentUserId ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/28"
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment() } }}
                        />
                        <button type="button" onClick={handlePostComment} disabled={postingComment || !commentText.trim()} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F6EF7] text-white disabled:opacity-40">
                          {postingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Quick reply */}
              {!ownStory && currentUserId ? (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${group?.name || "user"}...`}
                    className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/28"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuickReply() } }}
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={handleQuickReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#4F6EF7] to-[#6D28D9] text-white disabled:opacity-40"
                  >
                    {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </motion.button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// ========== StatusPage (Main) ==========

export default function StatusPage() {
  const { user, isAdmin } = useAuth()
  const uid = user?.id
  const isMobile = useIsMobile()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [followState, setFollowState] = useState<Map<string, boolean>>(new Map())
  const [followCounts, setFollowCounts] = useState<Map<string, { followers: number; following: number }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const viewedRef = useRef<Set<string>>(new Set())

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSocialPosts("all", uid)
      setPosts(data)

      const userIds = [...new Set(data.map((p) => p.userId))]
      const [countsEntries, followingEntries] = await Promise.all([
        Promise.all(userIds.map(async (id) => [id, await fetchFollowCounts(id)] as const)),
        uid ? Promise.all(userIds.map(async (id) => [id, id === uid ? false : await isFollowing(uid, id)] as const)) : Promise.resolve([]),
      ])
      setFollowCounts(new Map(countsEntries))
      setFollowState(new Map(followingEntries))
    } catch {
      setError("Could not load stories.")
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { queueMicrotask(() => { void loadPosts() }) }, [loadPosts])

  useEffect(() => {
    const unseen = posts.filter((p) => !viewedRef.current.has(p.id)).slice(0, 20)
    for (const post of unseen) {
      viewedRef.current.add(post.id)
      void recordSocialPostView(post.id, uid)
    }
  }, [posts, uid])

  const groups = useMemo(() => groupStories(posts, followState, followCounts), [posts, followState, followCounts])
  const selectedGroup = useMemo(() => groups.find((g) => g.userId === selectedGroupId) || null, [groups, selectedGroupId])
  const viewedUserIds = useMemo(() => {
    const viewed = new Set<string>()
    for (const group of groups) {
      if (group.posts.every((post) => viewedRef.current.has(post.id))) {
        viewed.add(group.userId)
      }
    }
    return viewed
  }, [groups])

  const handleCreate = async (state: StoryFormState) => {
    if (!uid) { toast.error("Login required."); return false }
    const validation = validateStory(state)
    if (validation) { toast.error(validation); return false }
    const post = await createSocialPost(uid, state.content.trim(), state.image?.url, state.image?.type, state.category)
    if (!post) { toast.error("Could not publish story."); return false }
    setPosts((prev) => [post, ...prev])
    return true
  }

  const handleDelete = async (post: SocialPost) => {
    if (!isAdmin) return
    const ok = await deleteSocialPost(post.id)
    if (ok) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      toast.success("Story removed.")
    } else { toast.error("Could not remove story.") }
  }

  return (
    <PageShell
      eyebrow="Community"
      title="Stories"
      subtitle="Quick, immersive updates from the CAFÉ community."
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] rounded-[36px] bg-[radial-gradient(circle_at_18%_6%,rgba(79,110,247,0.18),transparent_34%),radial-gradient(circle_at_82%_14%,rgba(139,92,246,0.10),transparent_30%)] blur-3xl sm:h-[480px] sm:rounded-[56px]" />

        {!uid ? (
          <div className="mb-5 rounded-2xl border border-amber-300/18 bg-amber-300/8 p-4 text-sm text-amber-100/78">
            Login to publish stories, like, save and reply.
          </div>
        ) : null}

        <StoryBar
          loading={loading}
          groups={groups}
          selectedId={selectedGroupId || undefined}
          signedIn={Boolean(uid)}
          viewedSet={viewedUserIds}
          onCreate={() => setShowComposer(true)}
          onOpenGroup={(group) => setSelectedGroupId(group.userId)}
        />

        {error ? (
          <div className="mt-10 rounded-[30px] border border-red-400/20 bg-red-400/10 p-8 text-center">
            <AlertCircle size={26} className="mx-auto mb-3 text-red-200" />
            <p className="text-sm text-red-100">{error}</p>
            <button type="button" onClick={loadPosts} className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black">Try again</button>
          </div>
        ) : !loading && groups.length === 0 ? (
          <motion.div
            initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-[30px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-10 text-center backdrop-blur-2xl"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F6EF7]/14 text-[#8FB0FF]">
              <Sparkles size={28} />
            </div>
            <h3 className="text-xl font-semibold text-white">No stories yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/48">
              Share progress, projects, wins, lifestyle or behind-the-scenes updates with the CAFÉ community.
            </p>
            <button type="button" onClick={() => setShowComposer(true)} disabled={!uid} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-45">
              <Plus size={16} />
              Create Your First Story
            </button>
          </motion.div>
        ) : null}
      </div>

      <motion.button
        type="button"
        whileHover={isMobile ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowComposer(true)}
        disabled={!uid}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#4F6EF7] to-[#6D28D9] text-white shadow-[0_22px_70px_rgba(79,110,247,0.42)] transition disabled:opacity-45"
        aria-label="Create story"
      >
        <Plus size={24} />
      </motion.button>

      <CreateStoryModal open={showComposer} onClose={() => setShowComposer(false)} onSubmit={handleCreate} userId={uid} />
      <StoryViewer
        group={selectedGroup}
        currentUserId={uid}
        isAdmin={isAdmin}
        onClose={() => setSelectedGroupId(null)}
        onFollowChanged={loadPosts}
        onDeleteStatus={handleDelete}
      />
    </PageShell>
  )
}
