import { Link } from "react-router-dom"
import { ArrowUp, Image, MessageCircle, PenLine, Search, Share2, Video } from "lucide-react"
import PageShell from "./PageShell"
import type { FeedbackEntry } from "../data/feedbackStore"

interface FeedbackPageProps {
  feedbacks: FeedbackEntry[]
}

export default function FeedbackPage({ feedbacks }: FeedbackPageProps) {
  const approved = feedbacks.filter((item) => item.approved)

  return (
    <PageShell
      eyebrow="Community feedback"
      title="Feedback Forum"
      subtitle="A forum-style space for clients to publish project stories, screenshots, videos, outcomes, and longer discussions after delivery."
    >
      <div className="grid gap-6 lg:grid-cols-[260px_1fr_280px]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">Channels</p>
            {["All feedbacks", "Web apps", "Landing pages", "SaaS", "Results"].map((channel, index) => (
              <button key={channel} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${index === 0 ? "bg-[#2563eb]/10 text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"}`}>
                <span>{channel}</span>
                <span className="text-xs text-zinc-700">0</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3b82f6]/30 bg-[#2563eb]/10 text-sm font-bold text-white">
              CS
            </div>
            <Link to="/signup" className="flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-left text-sm text-zinc-600 transition-colors hover:border-[#3b82f6]/30 hover:text-zinc-300">
              Share your project feedback...
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-[#3b82f6]/40 bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]">
              <PenLine size={16} />
              Post
            </Link>
          </div>

          {approved.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3b82f6]/25 bg-[#2563eb]/10 text-[#60a5fa]">
                <MessageCircle size={24} />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-white">No feedback posts yet</h2>
              <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-zinc-500">
                Once clients publish feedback and the admin approves it from the backend, posts will appear here like a community feed.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/signup" className="inline-flex items-center justify-center rounded-xl border border-[#3b82f6]/40 bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8]">
                  Create feedback post
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.04]">
                  Client login
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {approved.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <div className="flex gap-4 p-5">
                    <div className="hidden sm:flex w-12 shrink-0 flex-col items-center gap-2 text-zinc-600">
                      <ArrowUp size={18} />
                      <span className="text-xs font-bold">0</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                        <span className="font-medium text-zinc-400">{item.name}</span>
                        <span>in</span>
                        <span className="rounded-full border border-[#3b82f6]/20 bg-[#2563eb]/10 px-2 py-0.5 text-[#93c5fd]">{item.project || "Project feedback"}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString("en-US")}</span>
                      </div>
                      <h2 className="mb-3 text-xl font-bold text-white">{item.project}</h2>
                      <blockquote className="mb-4 text-sm leading-relaxed text-zinc-400">&ldquo;{item.quote}&rdquo;</blockquote>
                      {item.mediaUrl && (
                        <div className="relative mb-4 h-72 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a1628]">
                          <img src={item.mediaUrl} alt={item.project || item.company} className="h-full w-full object-cover opacity-75" />
                          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur">
                            {item.mediaType === "video" ? <Video size={14} /> : <Image size={14} />}
                            {item.mediaType || "image"}
                          </div>
                        </div>
                      )}
                      {item.result && (
                        <p className="mb-4 rounded-xl border border-[#3b82f6]/15 bg-[#2563eb]/10 px-4 py-3 text-sm text-[#93c5fd]">{item.result}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs font-semibold text-zinc-500">
                        <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/[0.04] hover:text-zinc-300">
                          <MessageCircle size={14} />
                          Reply
                        </button>
                        <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/[0.04] hover:text-zinc-300">
                          <Share2 size={14} />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-zinc-600">
                <Search size={15} />
                <span className="text-sm">Search feedbacks</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-600">
                Posts are empty until the backend returns approved client feedback.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">Posting rules</p>
              <div className="space-y-2 text-sm text-zinc-500">
                <p>Share real project context.</p>
                <p>Add images, videos, or measurable results.</p>
                <p>Admin approval is required before publishing.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  )
}
