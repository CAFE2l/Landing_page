import { motion } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"

interface ConfirmModalProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  variant?: "danger" | "default"
  confirmLabel?: string
}

export default function ConfirmModal({ title, message, onConfirm, onCancel, variant = "default", confirmLabel }: ConfirmModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#050508]/90 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        <div className="mb-5 flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${variant === "danger" ? "bg-red-500/10 text-red-400" : "bg-white/[0.06] text-[#f0f0f5]"}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#f0f0f5]">{title}</h2>
            <p className="mt-1 text-sm text-[#6b6b80]">{message}</p>
          </div>
          <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6b80] hover:bg-white/[0.06] hover:text-[#f0f0f5]">
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-[#6b6b80] hover:text-[#f0f0f5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              variant === "danger"
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-[#4f6ef7]/10 text-[#4f6ef7] hover:bg-[#4f6ef7]/20"
            }`}
          >
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
