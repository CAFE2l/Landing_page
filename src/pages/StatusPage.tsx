import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserPlus,
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
import {
  createSocialPost,
  deleteSocialPost,
  fetchFollowCounts,
  fetchSocialPostReportCounts,
  fetchSocialPosts,
  hideSocialPost,
  isFollowing,
  recordSocialPostView,
  toggleFollow,
  toggleSocialLike,
} from "../lib/socialService"
import { cn, timeAgo } from "../lib/utils"

type FeedMode = "all" | "following"
type CategoryFilter = SocialStatusCategory | "all"

interface StatusFormState {
  content: string
  category: SocialStatusCategory
  image: { url: string; type: "image" } | null
}

interface StatusGroup {
  userId: string
  name: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  category: SocialStatusCategory
  posts: SocialPost[]
  followers: number | null
  following: number | null
  followedByMe: boolean
}

const MAX_STATUS_CHARS = 700
const MAX_IMAGE_SIZE = 8 * 1024 * 1024

const CATEGORY_META: Record<
  SocialStatusCategory,
  { name: string; short: string; color: string; ring: string; glow: string; icon: typeof Sparkles }
> = {
  business: {
    name: "Business",
    short: "Business",
    color: "border-sky-400/25 bg-sky-400/10 text-sky-200",
    ring: "from-sky-400 via-blue-500 to-cyan-300",
    glow: "shadow-[0_0_34px_rgba(56,189,248,0.18)]",
    icon: BriefcaseBusiness,
  },
  project: {
    name: "Project",
    short: "Project",
    color: "border-violet-400/25 bg-violet-400/10 text-violet-200",
    ring: "from-violet-400 via-fuchsia-500 to-blue-400",
    glow: "shadow-[0_0_34px_rgba(139,92,246,0.18)]",
    icon: Target,
  },
  study: {
    name: "Study",
    short: "Study",
    color: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    ring: "from-emerald-300 via-teal-500 to-sky-400",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.16)]",
    icon: BookOpen,
  },
  lifestyle: {
    name: "Lifestyle",
    short: "Lifestyle",
    color: "border-orange-300/25 bg-orange-300/10 text-orange-100",
    ring: "from-orange-300 via-rose-400 to-amber-300",
    glow: "shadow-[0_0_34px_rgba(251,146,60,0.16)]",
    icon: UserRound,
  },
  win: {
    name: "Win",
    short: "Win",
    color: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    ring: "from-amber-200 via-yellow-400 to-orange-300",
    glow: "shadow-[0_0_34px_rgba(251,191,36,0.16)]",
    icon: Trophy,
  },
  behind_the_scenes: {
    name: "Behind The Scenes",
    short: "BTS",
    color: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    ring: "from-slate-200 via-cyan-400 to-blue-500",
    glow: "shadow-[0_0_34px_rgba(148,163,184,0.16)]",
    icon: Camera,
  },
}

const CATEGORIES = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id: id as SocialStatusCategory, ...meta }))

const FILTERS: Array<{ label: string; value: CategoryFilter | FeedMode; type: "mode" | "category" }> = [
  { label: "All Status", value: "all", type: "mode" },
  { label: "Following", value: "following", type: "mode" },
  { label: "Business", value: "business", type: "category" },
  { label: "Project", value: "project", type: "category" },
  { label: "Study", value: "study", type: "category" },
  { label: "Lifestyle", value: "lifestyle", type: "category" },
  { label: "Win", value: "win", type: "category" },
  { label: "Behind The Scenes", value: "behind_the_scenes", type: "category" },
]

const DEFAULT_FORM: StatusFormState = {
  content: "",
  category: "project",
  image: null,
}

function validateStatus(form: StatusFormState) {
  const content = form.content.trim()
  if (!content && !form.image) return "Write a status or add an image before publishing."
  if (content.length > MAX_STATUS_CHARS) return `Status must be ${MAX_STATUS_CHARS} characters or less.`
  if (!CATEGORY_META[form.category]) return "Choose a valid category."
  return null
}

function groupStatus(posts: SocialPost[], followState: Map<string, boolean>, counts: Map<string, { followers: number; following: number }>): StatusGroup[] {
  const groups = new Map<string, StatusGroup>()
  for (const post of posts) {
    const existing = groups.get(post.userId)
    if (existing) {
      existing.posts.push(post)
      continue
    }
    const followCounts = counts.get(post.userId)
    groups.set(post.userId, {
      userId: post.userId,
      name: post.user?.name || "CAFÉ member",
      username: post.user?.username || null,
      avatarUrl: post.user?.avatarUrl || null,
      bio: null,
      category: post.category,
      posts: [post],
      followers: followCounts?.followers ?? null,
      following: followCounts?.following ?? null,
      followedByMe: followState.get(post.userId) || false,
    })
  }
  return [...groups.values()].sort((a, b) => new Date(b.posts[0]?.createdAt || 0).getTime() - new Date(a.posts[0]?.createdAt || 0).getTime())
}

function CategoryBadge({ category }: { category: SocialStatusCategory }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.business
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", meta.color)}>
      <Icon size={12} />
      {meta.name}
    </span>
  )
}

function StatusAvatar({
  group,
  active,
  onClick,
}: {
  group: StatusGroup
  active: boolean
  onClick: () => void
}) {
  const meta = CATEGORY_META[group.category] || CATEGORY_META.business
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3, scale: 1.035 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group w-[86px] shrink-0 text-center"
    >
      <span
        className={cn(
          "mx-auto block rounded-full bg-gradient-to-br p-[2px] transition",
          meta.ring,
          active ? "shadow-[0_0_36px_rgba(126,161,255,0.35)]" : meta.glow,
        )}
      >
        <span className="block rounded-full bg-[#07080d] p-[3px]">
          <UserAvatar user={{ name: group.name, avatarUrl: group.avatarUrl }} size="lg" className="h-[58px] w-[58px]" ring={false} />
        </span>
      </span>
      <span className="mt-2 block truncate text-xs font-semibold text-white/80 transition group-hover:text-white">{group.name}</span>
      <span className="mt-0.5 block truncate text-[10px] text-white/36">{meta.short}</span>
    </motion.button>
  )
}

function StatusRail({
  loading,
  groups,
  selectedId,
  signedIn,
  onCreate,
  onOpenGroup,
}: {
  loading: boolean
  groups: StatusGroup[]
  selectedId?: string
  signedIn: boolean
  onCreate: () => void
  onOpenGroup: (group: StatusGroup) => void
}) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <motion.button
          type="button"
          whileHover={{ y: -3, scale: 1.035 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreate}
          disabled={!signedIn}
          className="group w-[86px] shrink-0 text-center disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="mx-auto flex h-[66px] w-[66px] items-center justify-center rounded-full border border-dashed border-[#7EA1FF]/50 bg-[#4F6EF7]/12 text-[#B9C8FF] shadow-[0_0_30px_rgba(79,110,247,0.16)] transition group-hover:border-[#9bb3ff]/80 group-hover:bg-[#4F6EF7]/18">
            <Plus size={22} />
          </span>
          <span className="mt-2 block text-xs font-semibold text-white/82">Create</span>
          <span className="mt-0.5 block text-[10px] text-white/36">Status</span>
        </motion.button>

        {loading
          ? [0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="w-[86px] shrink-0 text-center">
                <div className="mx-auto h-[66px] w-[66px] animate-pulse rounded-full bg-white/[0.06]" />
                <div className="mx-auto mt-2 h-3 w-14 animate-pulse rounded bg-white/[0.06]" />
                <div className="mx-auto mt-1 h-2 w-10 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))
          : groups.map((group) => (
              <StatusAvatar
                key={group.userId}
                group={group}
                active={selectedId === group.userId}
                onClick={() => onOpenGroup(group)}
              />
            ))}
      </div>
    </section>
  )
}

function StatusComposer({
  open,
  userId,
  onClose,
  onSubmit,
}: {
  open: boolean
  userId?: string
  onClose: () => void
  onSubmit: (state: StatusFormState) => Promise<boolean>
}) {
  const [form, setForm] = useState<StatusFormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">("idle")
  const fileRef = useRef<HTMLInputElement | null>(null)
  const error = validateStatus(form)
  const remaining = MAX_STATUS_CHARS - form.content.length

  const update = <Key extends keyof StatusFormState>(key: Key, value: StatusFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFeedback("idle")
  }

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!userId) {
      toast.error("Login required to upload an image.")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Use a valid image file.")
      setFeedback("error")
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be under 8MB.")
      setFeedback("error")
      return
    }

    setUploading(true)
    const result = await uploadChatMedia(file, userId)
    setUploading(false)
    if (!result || !result.mimeType.startsWith("image")) {
      toast.error("Could not upload this image.")
      setFeedback("error")
      return
    }
    update("image", { url: result.url, type: "image" })
  }

  const submit = async () => {
    const validation = validateStatus(form)
    if (validation) {
      toast.error(validation)
      setFeedback("error")
      return
    }
    setSubmitting(true)
    const ok = await onSubmit(form)
    setSubmitting(false)
    setFeedback(ok ? "success" : "error")
    if (ok) {
      toast.success("Status published.")
      setForm(DEFAULT_FORM)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/76 p-4 backdrop-blur-2xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/[0.11] bg-[#090a10]/96 shadow-[0_44px_130px_rgba(0,0,0,0.62)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_26%_0%,rgba(79,110,247,0.22),transparent_42%),radial-gradient(circle_at_82%_8%,rgba(139,92,246,0.14),transparent_36%)]" />
            <div className="relative max-h-[92vh] overflow-y-auto p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7EA1FF]">Create Status</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Share what you are building</h2>
                  <p className="mt-1 text-sm text-white/46">Progress, projects, wins, lifestyle and behind-the-scenes updates.</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {CATEGORIES.map((category) => {
                  const selected = form.category === category.id
                  const Icon = category.icon
                  return (
                    <motion.button
                      key={category.id}
                      type="button"
                      whileHover={{ y: -1 }}
                      onClick={() => update("category", category.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                        selected ? category.color : "border-white/[0.08] bg-white/[0.035] text-white/48 hover:bg-white/[0.055] hover:text-white",
                      )}
                    >
                      <Icon size={15} />
                      {category.name}
                    </motion.button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-[24px] border border-white/[0.08] bg-black/24 p-4">
                <textarea
                  value={form.content}
                  onChange={(event) => update("content", event.target.value)}
                  placeholder="Share your business, project, study note, win or behind-the-scenes..."
                  rows={6}
                  className={cn(
                    "min-h-36 w-full resize-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-white/28",
                    remaining < 0 && "text-red-100",
                  )}
                />
                {form.image ? (
                  <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                    <img src={form.image.url} alt="Status preview" className="max-h-[340px] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => update("image", null)}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/72 text-white transition hover:bg-red-500"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.025] p-5 text-center">
                    <ImagePlus className="mx-auto text-white/28" size={22} />
                    <p className="mt-2 text-xs text-white/38">No image selected. Add one for a richer visual status.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || !userId}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-semibold text-white/66 transition hover:border-[#7EA1FF]/45 hover:bg-white/[0.065] hover:text-white disabled:opacity-40"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                    Add Image
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  <span className={cn("text-xs", remaining < 0 ? "text-red-300" : remaining < 90 ? "text-amber-300" : "text-white/36")}>{remaining}</span>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || uploading || Boolean(error)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Create Status
                </button>
              </div>

              <AnimatePresence>
                {(feedback !== "idle" || error) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={cn(
                      "mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs",
                      feedback === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-amber-400/20 bg-amber-400/10 text-amber-100",
                    )}
                  >
                    {feedback === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {feedback === "success" ? "Status published." : error || "Check the status and try again."}
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

function StatusViewer({
  group,
  currentUserId,
  onClose,
  onFollowChanged,
  onOpenProfile,
}: {
  group: StatusGroup | null
  currentUserId?: string
  onClose: () => void
  onFollowChanged: () => Promise<void>
  onOpenProfile: (group: StatusGroup) => void
}) {
  const [busyFollow, setBusyFollow] = useState(false)
  const navigate = useNavigate()

  const handleFollow = async () => {
    if (!group || !currentUserId) {
      toast.error("Login required to follow members.")
      return
    }
    if (currentUserId === group.userId) return
    setBusyFollow(true)
    const ok = await toggleFollow(currentUserId, group.userId)
    setBusyFollow(false)
    if (!ok) {
      toast.error("Could not update follow.")
      return
    }
    await onFollowChanged()
  }

  return (
    <AnimatePresence>
      {group ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-3 backdrop-blur-2xl md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 250, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/[0.11] bg-[#090a10]/96 shadow-[0_48px_150px_rgba(0,0,0,0.65)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(79,110,247,0.22),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(139,92,246,0.16),transparent_32%)]" />
            <div className="relative max-h-[92vh] overflow-y-auto">
              <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#090a10]/78 px-5 py-4 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={{ name: group.name, avatarUrl: group.avatarUrl }} size="lg" className="h-13 w-13" />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">{group.name}</p>
                      <p className="truncate text-xs text-white/42">{group.username ? `@${group.username}` : "CAFÉ community member"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-[320px_minmax(0,1fr)] md:p-6">
                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.045] p-5 backdrop-blur-xl">
                    <div className="flex flex-col items-center text-center">
                      <span className={cn("rounded-full bg-gradient-to-br p-[2px]", CATEGORY_META[group.category].ring)}>
                        <span className="block rounded-full bg-[#090a10] p-1">
                          <UserAvatar user={{ name: group.name, avatarUrl: group.avatarUrl }} size="xl" className="h-24 w-24" ring={false} />
                        </span>
                      </span>
                      <h2 className="mt-4 text-xl font-semibold text-white">{group.name}</h2>
                      <p className="mt-1 text-sm text-white/42">{group.bio || "Sharing progress, projects and updates with the CAFÉ community."}</p>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl border border-white/[0.07] bg-black/18 p-3">
                        <p className="text-lg font-semibold text-white">{group.posts.length}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/36">Status</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.07] bg-black/18 p-3">
                        <p className="text-lg font-semibold text-white">{group.followers ?? "—"}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/36">Followers</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.07] bg-black/18 p-3">
                        <p className="text-lg font-semibold text-white">{group.following ?? "—"}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/36">Following</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(group)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        View Profile
                        <ArrowRight size={15} />
                      </button>
                      {currentUserId !== group.userId ? (
                        <button
                          type="button"
                          onClick={handleFollow}
                          disabled={busyFollow || !currentUserId}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] text-sm font-semibold text-white/76 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-45"
                        >
                          {busyFollow ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                          {group.followedByMe ? "Following" : "Follow"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => navigate("/messages")}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] text-sm font-semibold text-white/76 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <MessageCircle size={15} />
                        Send Message
                      </button>
                    </div>
                  </div>
                </aside>

                <motion.div className="space-y-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
                  {group.posts.map((post) => (
                    <motion.article
                      key={post.id}
                      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                      className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl"
                    >
                      {post.mediaUrl && post.mediaType === "image" ? (
                        <img src={post.mediaUrl} alt="" className="max-h-[460px] w-full object-cover" />
                      ) : null}
                      <div className="p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <CategoryBadge category={post.category} />
                          <span className="text-xs text-white/34">{timeAgo(post.createdAt)}</span>
                        </div>
                        {post.content ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/76">{post.content}</p> : null}
                        <div className="mt-4 flex items-center gap-4 text-xs text-white/42">
                          <span>{post.likesCount} likes</span>
                          <span>{post.commentsCount} comments</span>
                          <span>{post.viewsCount} views</span>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function QuickComposer({ signedIn, onCreate }: { signedIn: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7EA1FF]">Quick Composer</p>
      <h3 className="mt-2 text-base font-semibold text-white">Share what you are building, learning or celebrating.</h3>
      <button
        type="button"
        onClick={onCreate}
        disabled={!signedIn}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Plus size={16} />
        Create Status
      </button>
    </div>
  )
}

function StatusSidebar({
  mode,
  category,
  recent,
  signedIn,
  onCreate,
  onMode,
  onCategory,
  onOpen,
}: {
  mode: FeedMode
  category: CategoryFilter
  recent: StatusGroup[]
  signedIn: boolean
  onCreate: () => void
  onMode: (mode: FeedMode) => void
  onCategory: (category: CategoryFilter) => void
  onOpen: (group: StatusGroup) => void
}) {
  return (
    <aside className="hidden space-y-4 xl:block">
      <QuickComposer signedIn={signedIn} onCreate={onCreate} />
      <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Discovery Filters</p>
        <div className="mt-3 space-y-1.5">
          {FILTERS.map((filter) => {
            const active = filter.type === "mode" ? mode === filter.value && category === "all" : category === filter.value
            return (
              <button
                key={`${filter.type}-${filter.value}`}
                type="button"
                onClick={() => {
                  if (filter.type === "mode") {
                    onMode(filter.value as FeedMode)
                    onCategory("all")
                  } else {
                    onCategory(filter.value as CategoryFilter)
                  }
                }}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-semibold transition",
                  active ? "bg-white text-black" : "text-white/50 hover:bg-white/[0.055] hover:text-white",
                )}
              >
                {filter.label}
                {active ? <CheckCircle2 size={14} /> : null}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">Recent Status</p>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm leading-5 text-white/42">No recent status yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recent.slice(0, 5).map((group) => (
              <button key={group.userId} type="button" onClick={() => onOpen(group)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/[0.055]">
                <UserAvatar user={{ name: group.name, avatarUrl: group.avatarUrl }} size="sm" ring={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white/82">{group.name}</span>
                  <span className="block truncate text-xs text-white/34">{group.posts[0]?.content || CATEGORY_META[group.category].name}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function MobileFilters({
  mode,
  category,
  onMode,
  onCategory,
}: {
  mode: FeedMode
  category: CategoryFilter
  onMode: (mode: FeedMode) => void
  onCategory: (category: CategoryFilter) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map((filter) => {
        const active = filter.type === "mode" ? mode === filter.value && category === "all" : category === filter.value
        return (
          <button
            key={`${filter.type}-${filter.value}`}
            type="button"
            onClick={() => {
              if (filter.type === "mode") {
                onMode(filter.value as FeedMode)
                onCategory("all")
              } else {
                onCategory(filter.value as CategoryFilter)
              }
            }}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition",
              active ? "border-white/20 bg-white text-black" : "border-white/[0.08] bg-white/[0.04] text-white/52 hover:text-white",
            )}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

function StatusCard({
  post,
  liked,
  isAdmin,
  reportCount,
  onLike,
  onOpenViewer,
  onOpenProfile,
  onDelete,
  onHide,
}: {
  post: SocialPost
  liked: boolean
  isAdmin: boolean
  reportCount: number
  onLike: () => void
  onOpenViewer: () => void
  onOpenProfile: () => void
  onDelete: () => void
  onHide: () => void
}) {
  const [adminOpen, setAdminOpen] = useState(false)
  const hasImage = post.mediaUrl && post.mediaType === "image"
  const compactText = !hasImage && post.content.length < 160

  return (
    <motion.article
      layout
      variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      className="group overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] shadow-[0_28px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition hover:border-white/[0.15]"
    >
      {hasImage ? (
        <button type="button" onClick={onOpenViewer} className="block w-full overflow-hidden bg-white/[0.025]">
          <img src={post.mediaUrl || ""} alt="" className="max-h-[420px] w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
        </button>
      ) : null}
      <div className={cn("p-5", compactText && "p-6")}>
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onOpenViewer} className="flex min-w-0 items-center gap-3 text-left">
            <UserAvatar user={{ name: post.user?.name || "CAFÉ member", avatarUrl: post.user?.avatarUrl }} size="md" ring={false} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{post.user?.name || "CAFÉ member"}</span>
              <span className="block truncate text-xs text-white/38">{post.user?.username ? `@${post.user.username}` : "Community"} · {timeAgo(post.createdAt)}</span>
            </span>
          </button>
          <div className="relative flex items-center gap-2">
            <CategoryBadge category={post.category} />
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setAdminOpen((value) => !value)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                <MoreHorizontal size={15} />
              </button>
            ) : null}
            <AnimatePresence>
              {adminOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 top-10 z-10 w-46 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101018] shadow-2xl"
                >
                  <button type="button" onClick={onHide} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-white/70 hover:bg-white/[0.06]">
                    <EyeOff size={13} />
                    Hide status
                  </button>
                  <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-200 hover:bg-red-500/10">
                    <Trash2 size={13} />
                    Remove status
                  </button>
                  <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2.5 text-xs text-white/38">
                    <Flag size={13} />
                    {reportCount} reports
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {post.content ? (
          <button type="button" onClick={onOpenViewer} className="mt-4 block w-full text-left">
            <p className={cn("whitespace-pre-wrap leading-relaxed text-white/78", compactText ? "text-[17px]" : "text-[15px]")}>{post.content}</p>
          </button>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onLike}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm transition",
                liked ? "bg-[#4F6EF7]/15 text-[#8FB0FF]" : "text-white/48 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Heart size={16} className={liked ? "fill-current" : ""} />
              {post.likesCount}
            </button>
            <span className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-white/42">
              <MessageCircle size={16} />
              {post.commentsCount}
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-white/42">
              <Eye size={16} />
              {post.viewsCount}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-semibold text-white/68 transition hover:border-[#4F6EF7]/45 hover:text-white"
          >
            View Profile
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-[28px] border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-white/[0.07]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.06]" />
          </div>
          <div className="mt-4 h-44 animate-pulse rounded-2xl bg-white/[0.05]" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ mode, onCreate }: { mode: FeedMode; onCreate: () => void }) {
  const following = mode === "following"
  return (
    <div className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 text-center backdrop-blur-2xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F6EF7]/14 text-[#8FB0FF]">
        <Sparkles size={24} />
      </div>
      <h3 className="text-xl font-semibold text-white">{following ? "No following status yet" : "No community status yet"}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/48">
        {following
          ? "Follow community members to build a focused discovery feed."
          : "Share progress, projects, wins, lifestyle or behind-the-scenes updates from the CAFÉ community."}
      </p>
      <button type="button" onClick={onCreate} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90">
        <Plus size={16} />
        Create Status
      </button>
    </div>
  )
}

export default function StatusPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const uid = user?.id
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [reportCounts, setReportCounts] = useState<Map<string, number>>(new Map())
  const [followState, setFollowState] = useState<Map<string, boolean>>(new Map())
  const [followCounts, setFollowCounts] = useState<Map<string, { followers: number; following: number }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [feedMode, setFeedMode] = useState<FeedMode>("all")
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")
  const [query, setQuery] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const viewedRef = useRef<Set<string>>(new Set())

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSocialPosts(feedMode, uid)
      setPosts(data)
      setLikedPosts(new Set(data.filter((post) => post.liked).map((post) => post.id)))

      const userIds = [...new Set(data.map((post) => post.userId))]
      const [countsEntries, followingEntries, reports] = await Promise.all([
        Promise.all(userIds.map(async (id) => [id, await fetchFollowCounts(id)] as const)),
        uid ? Promise.all(userIds.map(async (id) => [id, id === uid ? false : await isFollowing(uid, id)] as const)) : Promise.resolve([]),
        isAdmin ? fetchSocialPostReportCounts(data.map((post) => post.id)) : Promise.resolve(new Map<string, number>()),
      ])

      setFollowCounts(new Map(countsEntries))
      setFollowState(new Map(followingEntries))
      setReportCounts(reports)
    } catch {
      setError("Could not load community status.")
    } finally {
      setLoading(false)
    }
  }, [feedMode, uid, isAdmin])

  useEffect(() => {
    queueMicrotask(() => {
      void loadPosts()
    })
  }, [loadPosts])

  useEffect(() => {
    const unseen = posts.filter((post) => !viewedRef.current.has(post.id)).slice(0, 20)
    for (const post of unseen) {
      viewedRef.current.add(post.id)
      void recordSocialPostView(post.id, uid)
    }
  }, [posts, uid])

  const groups = useMemo(() => groupStatus(posts, followState, followCounts), [posts, followState, followCounts])
  const selectedGroup = useMemo(() => groups.find((group) => group.userId === selectedGroupId) || null, [groups, selectedGroupId])

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return posts.filter((post) => {
      const matchesCategory = activeCategory === "all" || post.category === activeCategory
      const matchesQuery =
        !normalized ||
        [post.content, post.user?.name, post.user?.username, CATEGORY_META[post.category]?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [posts, activeCategory, query])

  const handleCreate = async (state: StatusFormState) => {
    if (!uid) {
      toast.error("Login required to create a status.")
      return false
    }
    const validation = validateStatus(state)
    if (validation) {
      toast.error(validation)
      return false
    }
    const post = await createSocialPost(uid, state.content.trim(), state.image?.url, state.image?.type, state.category)
    if (!post) {
      toast.error("Could not publish status.")
      return false
    }
    await loadPosts()
    return true
  }

  const handleLike = async (post: SocialPost) => {
    if (!uid) {
      toast.error("Login required to like status.")
      return
    }
    const wasLiked = likedPosts.has(post.id)
    setLikedPosts((current) => {
      const next = new Set(current)
      if (wasLiked) next.delete(post.id)
      else next.add(post.id)
      return next
    })
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, liked: !wasLiked, likesCount: Math.max(0, item.likesCount + (wasLiked ? -1 : 1)) }
          : item,
      ),
    )
    const ok = await toggleSocialLike(post.id, uid)
    if (!ok) {
      toast.error("Could not update like.")
      await loadPosts()
    }
  }

  const openProfile = (post: SocialPost) => {
    navigate(post.user?.username ? `/u/${post.user.username}` : `/profile/${post.userId}`)
  }

  const openGroupProfile = (group: StatusGroup) => {
    navigate(group.username ? `/u/${group.username}` : `/profile/${group.userId}`)
  }

  const handleDelete = async (post: SocialPost) => {
    if (!isAdmin) return
    const ok = await deleteSocialPost(post.id)
    if (ok) {
      toast.success("Status removed.")
      await loadPosts()
    } else {
      toast.error("Could not remove status.")
    }
  }

  const handleHide = async (post: SocialPost) => {
    if (!isAdmin) return
    const ok = await hideSocialPost(post.id, true)
    if (ok) {
      toast.success("Status hidden.")
      await loadPosts()
    } else {
      toast.error("Could not hide status.")
    }
  }

  return (
    <PageShell
      eyebrow="Community Showcase"
      title="Community Status"
      subtitle="Share progress, projects, wins, lifestyle and behind-the-scenes updates from the CAFÉ community."
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] rounded-[56px] bg-[radial-gradient(circle_at_18%_6%,rgba(79,110,247,0.22),transparent_34%),radial-gradient(circle_at_82%_14%,rgba(139,92,246,0.14),transparent_30%),radial-gradient(circle_at_54%_32%,rgba(14,165,233,0.10),transparent_28%)] blur-3xl" />

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7EA1FF]">Discovery feed</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Explore what the community is building</h2>
            <p className="mt-2 text-sm leading-6 text-white/48">Status updates stay published until the user or an admin removes them.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            disabled={!uid}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black shadow-[0_18px_50px_rgba(255,255,255,0.10)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus size={16} />
            Create Status
          </button>
        </div>

        <div className="space-y-5">
          <StatusRail
            loading={loading}
            groups={groups}
            selectedId={selectedGroupId || undefined}
            signedIn={Boolean(uid)}
            onCreate={() => setShowComposer(true)}
            onOpenGroup={(group) => setSelectedGroupId(group.userId)}
          />

          <MobileFilters
            mode={feedMode}
            category={activeCategory}
            onMode={setFeedMode}
            onCategory={setActiveCategory}
          />

          <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
            <StatusSidebar
              mode={feedMode}
              category={activeCategory}
              recent={groups}
              signedIn={Boolean(uid)}
              onCreate={() => setShowComposer(true)}
              onMode={setFeedMode}
              onCategory={setActiveCategory}
              onOpen={(group) => setSelectedGroupId(group.userId)}
            />

            <main className="min-w-0 space-y-4">
              <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-2xl">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/36">Live discovery</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Community updates</h3>
                  </div>
                  <label className="flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white/44 md:w-80">
                    <Search size={16} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search status, people or categories"
                      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                    />
                  </label>
                </div>
              </section>

              {!uid ? (
                <div className="rounded-2xl border border-amber-300/18 bg-amber-300/8 p-4 text-sm text-amber-100/78">
                  Login to publish, follow and like community status updates.
                </div>
              ) : null}

              {loading ? (
                <LoadingState />
              ) : error ? (
                <div className="rounded-[30px] border border-red-400/20 bg-red-400/10 p-8 text-center">
                  <AlertCircle size={26} className="mx-auto mb-3 text-red-200" />
                  <p className="text-sm text-red-100">{error}</p>
                  <button type="button" onClick={loadPosts} className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black">
                    Try again
                  </button>
                </div>
              ) : filteredPosts.length === 0 ? (
                <EmptyState mode={feedMode} onCreate={() => setShowComposer(true)} />
              ) : (
                <motion.div className="grid gap-4 lg:grid-cols-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}>
                  {filteredPosts.map((post) => (
                    <StatusCard
                      key={post.id}
                      post={post}
                      liked={likedPosts.has(post.id)}
                      isAdmin={isAdmin}
                      reportCount={reportCounts.get(post.id) || 0}
                      onLike={() => handleLike(post)}
                      onOpenViewer={() => setSelectedGroupId(post.userId)}
                      onOpenProfile={() => openProfile(post)}
                      onDelete={() => handleDelete(post)}
                      onHide={() => handleHide(post)}
                    />
                  ))}
                </motion.div>
              )}
            </main>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowComposer(true)}
        disabled={!uid}
        className="fixed bottom-5 right-5 z-40 inline-flex h-13 w-13 items-center justify-center rounded-full bg-white text-black shadow-[0_22px_70px_rgba(0,0,0,0.42)] transition hover:scale-105 disabled:opacity-45 xl:hidden"
      >
        <Plus size={22} />
      </button>

      <StatusComposer open={showComposer} onClose={() => setShowComposer(false)} onSubmit={handleCreate} userId={uid} />
      <StatusViewer
        group={selectedGroup}
        currentUserId={uid}
        onClose={() => setSelectedGroupId(null)}
        onFollowChanged={loadPosts}
        onOpenProfile={openGroupProfile}
      />
    </PageShell>
  )
}
