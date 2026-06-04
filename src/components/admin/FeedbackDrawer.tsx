import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Trash2, Image as ImageIcon } from "lucide-react"
import { useAdminStore } from "../../lib/store/adminStore"
import type { FeedbackEntry } from "../../lib/types"
import StatusBadge from "./StatusBadge"
import { getInitials, formatDate } from "../../lib/utils"

interface FeedbackDrawerProps {
  feedback: FeedbackEntry | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onDelete: (id: string) => void
  onUpdateNote: (id: string, note: string) => void
}

export default function FeedbackDrawer({ feedback, onApprove, onReject, onDelete, onUpdateNote }: FeedbackDrawerProps) {
  const closeDrawer = useAdminStore((s) => s.closeFeedbackDrawer)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  // Reset note state when a different feedback is loaded
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (feedback) setNote(feedback.adminNote || "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback?.id])

  useEffect(() => {
    if (!feedback || note === (feedback.adminNote || "")) return
    const timer = setTimeout(async () => {
      setSaving(true)
      await onUpdateNote(feedback.id, note)
      setSaving(false)
    }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, feedback])

  return (
    <AnimatePresence>
      {feedback && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#050508]/95 backdrop-blur-xl shadow-[-20px_0_60px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <h2 className="text-sm font-semibold text-[#f0f0f5]">Feedback Details</h2>
              <button onClick={closeDrawer} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6b80] hover:bg-white/[0.06] hover:text-[#f0f0f5] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] flex items-center justify-center text-sm font-bold text-white">
                  {getInitials(feedback.userName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-[#f0f0f5]">{feedback.userName}</p>
                  {feedback.userEmail && <p className="text-sm text-[#6b6b80]">{feedback.userEmail}</p>}
                  <div className="mt-1.5">
                    <StatusBadge status={feedback.status} size="md" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#f0f0f5] mb-2">{feedback.title || "Untitled"}</h3>
                <p className="text-sm text-[#6b6b80] leading-relaxed">{feedback.body}</p>
              </div>

              {feedback.verifiedResult && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <p className="text-xs font-semibold text-green-400 mb-1">Verified Result</p>
                  <p className="text-sm text-green-300">{feedback.verifiedResult}</p>
                </div>
              )}

              {feedback.mediaCount > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-3">Media ({feedback.mediaCount})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: Math.min(feedback.mediaCount, 6) }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
                        <ImageIcon size={20} className="text-[#6b6b80]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {feedback.metrics && Object.keys(feedback.metrics).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-3">Metrics</p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(feedback.metrics).map(([key, val]) => (
                      <div key={key} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-center">
                        <p className="text-lg font-bold text-[#f0f0f5]">{val}</p>
                        <p className="text-xs text-[#6b6b80] capitalize">{key}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wider">Admin Note</p>
                  {saving && <span className="text-xs text-[#6b6b80]">Saving...</span>}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a private note..."
                  rows={4}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 resize-none transition-colors"
                />
              </div>

              <div className="text-xs text-[#3a3a4a]">
                <p>Submitted {formatDate(feedback.createdAt, "MMM dd, yyyy 'at' HH:mm")}</p>
                {feedback.updatedAt && <p>Updated {formatDate(feedback.updatedAt, "MMM dd, yyyy")}</p>}
                <p className="mt-1">Channel: <span className="capitalize text-[#6b6b80]">{feedback.channel}</span></p>
              </div>
            </div>

            <div className="border-t border-white/[0.08] px-6 py-4 flex gap-3">
              <button
                onClick={() => { onApprove(feedback.id); closeDrawer() }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 px-4 py-2.5 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition-colors"
              >
                <Check size={16} />
                Approve
              </button>
              <button
                onClick={() => { onReject(feedback.id); closeDrawer() }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <X size={16} />
                Reject
              </button>
              <button
                onClick={() => { onDelete(feedback.id); closeDrawer() }}
                className="flex items-center justify-center rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
