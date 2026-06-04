import { Navigate } from "react-router-dom"
import { CheckCircle2, Trash2, XCircle } from "lucide-react"
import PageShell from "./PageShell"
import type { FeedbackEntry, UserProfile } from "../data/feedbackStore"

interface AdminPageProps {
  user: UserProfile | null
  feedbacks: FeedbackEntry[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onDelete: (id: string) => void
}

export default function AdminPage({ user, feedbacks, onApprove, onReject, onDelete }: AdminPageProps) {
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== "admin") return <Navigate to="/profile" replace />

  const pending = feedbacks.filter((item) => !item.approved).length
  const approved = feedbacks.filter((item) => item.approved).length

  return (
    <PageShell
      eyebrow="Admin dashboard"
      title="Manage client feedback"
      subtitle="Review client submissions, approve what appears on the main page, and remove outdated feedback from the public wall."
    >
      <div className="mb-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-600 font-semibold">Total</p>
          <p className="mt-2 text-3xl font-bold text-white">{feedbacks.length}</p>
        </div>
        <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#2563eb]/10 p-5">
          <p className="text-xs uppercase tracking-widest text-[#93c5fd] font-semibold">Approved</p>
          <p className="mt-2 text-3xl font-bold text-white">{approved}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
          <p className="text-xs uppercase tracking-widest text-amber-200 font-semibold">Pending</p>
          <p className="mt-2 text-3xl font-bold text-white">{pending}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr] gap-4 border-b border-white/[0.08] px-5 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 max-md:hidden">
          <span>Feedback</span>
          <span>Client</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-white/[0.08]">
          {feedbacks.map((item) => (
            <article key={item.id} className="grid gap-5 px-5 py-5 md:grid-cols-[1.2fr_0.8fr_0.7fr] md:items-center">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-white">{item.project || item.company}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    item.approved
                      ? "border border-[#3b82f6]/20 bg-[#2563eb]/10 text-[#93c5fd]"
                      : "border border-amber-400/20 bg-amber-400/10 text-amber-200"
                  }`}>
                    {item.approved ? "Approved" : "Pending"}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500">&ldquo;{item.quote}&rdquo;</p>
                {item.result && <p className="mt-2 text-xs text-[#93c5fd]">{item.result}</p>}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-zinc-600">{item.role}, {item.company}</p>
                <p className="mt-1 text-xs text-zinc-700">{new Date(item.createdAt).toLocaleDateString("en-US")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onApprove(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#3b82f6]/25 bg-[#2563eb]/10 px-3 py-2 text-xs font-semibold text-[#93c5fd] hover:bg-[#2563eb]/20">
                  <CheckCircle2 size={14} />
                  Approve
                </button>
                <button onClick={() => onReject(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04]">
                  <XCircle size={14} />
                  Hide
                </button>
                <button onClick={() => onDelete(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/15">
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
