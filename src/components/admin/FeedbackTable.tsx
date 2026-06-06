import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Trash2, Eye, ChevronDown, MessageSquare, Image as ImageIcon } from "lucide-react"
import type { FeedbackEntry } from "../../lib/types"
import StatusBadge from "./StatusBadge"
import { formatDate } from "../../lib/utils"
import UserAvatar from "../ui/UserAvatar"
import { cn } from "../../lib/utils"
import { useAdminStore } from "../../lib/store/adminStore"

interface FeedbackTableProps {
  feedbacks: FeedbackEntry[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onDelete: (id: string) => void
}

export default function FeedbackTable({ feedbacks, onApprove, onReject, onDelete }: FeedbackTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const openFeedbackDrawer = useAdminStore((s) => s.openFeedbackDrawer)
  const showConfirm = useAdminStore((s) => s.showConfirm)

  const allSelected = feedbacks.length > 0 && selectedIds.size === feedbacks.length

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(feedbacks.map((f) => f.id)))
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          className="flex items-center gap-3 border-b border-white/[0.08] bg-[#4f6ef7]/10 px-4 py-3"
        >
          <span className="text-sm text-[#f0f0f5]">{selectedIds.size} selected</span>
          <button onClick={() => { selectedIds.forEach((id) => onApprove(id)); setSelectedIds(new Set()) }} className="ml-auto rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors">
            Approve All
          </button>
          <button onClick={() => { selectedIds.forEach((id) => onReject(id)); setSelectedIds(new Set()) }} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors">
            Reject All
          </button>
          <button onClick={() => showConfirm("Delete selected?", "This action cannot be undone.", () => { selectedIds.forEach((id) => onDelete(id)); setSelectedIds(new Set()) })} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors">
            Delete
          </button>
        </motion.div>
      )}

      <div className="hidden lg:grid lg:grid-cols-[36px_1fr_0.7fr_0.5fr_0.5fr_0.5fr_0.5fr_1fr] gap-4 border-b border-white/[0.08] bg-white/[0.02] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#6b6b80]">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-white/[0.08] bg-white/[0.04] accent-[#4f6ef7]"
          />
        </div>
        <span>Client</span>
        <span>Title</span>
        <span>Channel</span>
        <span>Status</span>
        <span>Media</span>
        <span>Submitted</span>
        <span>Actions</span>
      </div>

      <div>
        {feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare size={40} className="text-[#3a3a4a] mb-4" />
            <p className="text-sm font-medium text-[#6b6b80]">No feedbacks found</p>
            <p className="text-xs text-[#3a3a4a] mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          feedbacks.map((feedback, i) => {
            const expanded = expandedId === feedback.id
            return (
              <div key={feedback.id}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "grid lg:grid-cols-[36px_1fr_0.7fr_0.5fr_0.5fr_0.5fr_0.5fr_1fr] gap-4 border-b border-white/[0.04] px-5 py-3.5 transition-colors hover:bg-white/[0.02] items-center",
                    expanded && "bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(feedback.id)}
                      onChange={() => toggleSelect(feedback.id)}
                      className="h-4 w-4 rounded border-white/[0.08] bg-white/[0.04] accent-[#4f6ef7]"
                    />
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={{ name: feedback.userName }} size="sm" ring={false} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#f0f0f5] truncate">{feedback.userName}</p>
                      {feedback.userEmail && <p className="text-xs text-[#6b6b80] truncate">{feedback.userEmail}</p>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => setExpandedId(expanded ? null : feedback.id)}
                      className="flex items-center gap-1.5 text-sm text-[#f0f0f5] hover:text-[#4f6ef7] transition-colors"
                    >
                      <ChevronDown size={14} className={cn("shrink-0 transition-transform", expanded && "rotate-180")} />
                      <span className="truncate">{feedback.title || "Untitled"}</span>
                    </button>
                  </div>
                  <div>
                    <span className="text-xs text-[#6b6b80] capitalize">{feedback.channel}</span>
                  </div>
                  <div>
                    <StatusBadge status={feedback.status} />
                  </div>
                  <div>
                    {feedback.mediaCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#6b6b80]">
                        <ImageIcon size={12} />
                        {feedback.mediaCount}
                      </span>
                    ) : (
                      <span className="text-xs text-[#3a3a4a]">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-[#6b6b80]">
                      {formatDate(feedback.createdAt, "MMM dd")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openFeedbackDrawer(feedback.id)}
                      className="rounded-lg p-1.5 text-[#6b6b80] hover:bg-white/[0.06] hover:text-[#f0f0f5] transition-colors"
                      title="View details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => onApprove(feedback.id)}
                      className="rounded-lg p-1.5 text-[#6b6b80] hover:bg-green-500/10 hover:text-green-400 transition-colors"
                      title="Approve"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => onReject(feedback.id)}
                      className="rounded-lg p-1.5 text-[#6b6b80] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Reject"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={() => showConfirm("Delete feedback?", "This action cannot be undone.", () => onDelete(feedback.id))}
                      className="rounded-lg p-1.5 text-[#6b6b80] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-b border-white/[0.04]"
                    >
                      <div className="px-5 py-4 bg-white/[0.01]">
                        <p className="text-sm text-[#6b6b80] leading-relaxed">{feedback.body}</p>
                        {feedback.verifiedResult && (
                          <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                            <p className="text-xs text-green-400">{feedback.verifiedResult}</p>
                          </div>
                        )}
                        {feedback.metrics && Object.keys(feedback.metrics).length > 0 && (
                          <div className="mt-3 flex gap-4">
                            {Object.entries(feedback.metrics).map(([key, val]) => (
                              <div key={key} className="text-center">
                                <p className="text-sm font-semibold text-[#f0f0f5]">{val}</p>
                                <p className="text-xs text-[#6b6b80] capitalize">{key}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
