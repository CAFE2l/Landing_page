import { motion } from "framer-motion"
import type { FeedbackStatus } from "../../lib/types"
import { cn } from "../../lib/utils"

interface StatusBadgeProps {
  status: FeedbackStatus
  size?: "sm" | "md"
}

const config: Record<FeedbackStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  approved: { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const c = config[status]
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold capitalize",
        c.bg, c.text,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      {status === "pending" && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-1.5 w-1.5 rounded-full bg-yellow-400"
        />
      )}
      <span>{status}</span>
    </motion.span>
  )
}
