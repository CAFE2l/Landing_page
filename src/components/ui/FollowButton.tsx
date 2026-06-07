import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, UserCheck, Loader2 } from "lucide-react"
import { toggleFollow } from "../../lib/socialService"
import toast from "react-hot-toast"

interface FollowButtonProps {
  currentUserId: string
  targetUserId: string
  targetUserName?: string // kept for API compatibility
  initialFollowing?: boolean
  onStateChange?: (nowFollowing: boolean) => void
  className?: string
  variant?: "default" | "compact"
}

export default function FollowButton({
  currentUserId,
  targetUserId,
  initialFollowing = false,
  onStateChange,
  className = "",
  variant = "default",
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setFollowing(initialFollowing), 0)
    return () => window.clearTimeout(id)
  }, [initialFollowing])

  const handleClick = async () => {
    if (loading || currentUserId === targetUserId) return
    setLoading(true)
    const previousState = following
    const nextState = !previousState
    setFollowing(nextState)
    onStateChange?.(nextState)

    const ok = await toggleFollow(currentUserId, targetUserId)
    if (ok === false) {
      setFollowing(previousState)
      onStateChange?.(previousState)
      toast.error("Failed to update follow")
    }
    setLoading(false)
  }

  if (variant === "compact") {
    return (
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={loading || currentUserId === targetUserId}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium overflow-hidden ${
          following
            ? "border border-emerald-400/25 bg-emerald-950/70 text-emerald-300"
            : "bg-[#4F6EF7] text-white"
        } ${className}`}
        style={{
          borderColor: following
            ? hovering
              ? "rgba(110,231,183,0.45)"
              : "rgba(52,211,153,0.28)"
            : undefined,
          background: following
            ? hovering
              ? "rgba(6,78,59,0.82)"
              : "rgba(6,78,59,0.68)"
            : undefined,
          color: following ? "#86efac" : undefined,
          boxShadow: following ? "inset 0 0 18px rgba(16,185,129,0.08)" : undefined,
          transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease",
        }}
      >
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <Loader2 size={10} className="animate-spin" />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.span
              key={following ? (hovering ? "unfollow" : "following") : "follow"}
              initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex items-center gap-1"
            >
              {following ? (
                <UserCheck size={10} className="shrink-0" />
              ) : (
                <UserPlus size={10} className="shrink-0" />
              )}
              {following ? "Following" : "Follow"}
            </motion.span>
          </AnimatePresence>
        )}
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={loading || currentUserId === targetUserId}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        border: following ? `1px solid ${hovering ? "rgba(110,231,183,0.45)" : "rgba(52,211,153,0.28)"}` : "none",
        background: following
          ? hovering
            ? "rgba(6,78,59,0.82)"
            : "rgba(6,78,59,0.68)"
          : "linear-gradient(135deg, #4F6EF7, #6D28D9)",
        color: following
          ? "#86efac"
          : "#ffffff",
        boxShadow: following
          ? "inset 0 0 20px rgba(16,185,129,0.08)"
          : "0 0 20px rgba(79,110,247,0.2)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {loading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
        >
          <Loader2 size={16} className="animate-spin" />
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.span
            key={following ? (hovering ? "unfollow" : "following") : "follow"}
            initial={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            {following ? (
              <UserCheck size={16} className="shrink-0" />
            ) : (
              <UserPlus size={16} className="shrink-0" />
            )}
            {following ? "Following" : "Follow"}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.button>
  )
}
