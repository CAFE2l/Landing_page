import { useState } from "react"
import { motion } from "framer-motion"
import { UserPlus, Loader2 } from "lucide-react"
import { toggleFollow } from "../../lib/socialService"
import toast from "react-hot-toast"

interface FollowButtonProps {
  currentUserId: string
  targetUserId: string
  targetUserName?: string
  initialFollowing?: boolean
  onStateChange?: (nowFollowing: boolean) => void
  className?: string
  variant?: "default" | "compact"
}

export default function FollowButton({
  currentUserId,
  targetUserId,
  targetUserName,
  initialFollowing = false,
  onStateChange,
  className = "",
  variant = "default",
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || currentUserId === targetUserId) return
    setLoading(true)
    const previousState = following
    setFollowing((prev) => !prev)
    onStateChange?.(!previousState)

    const ok = await toggleFollow(currentUserId, targetUserId)
    if (ok !== undefined) {
      const nowFollowing = ok
      if (nowFollowing !== !previousState) {
        setFollowing(nowFollowing)
        onStateChange?.(nowFollowing)
      }
      if (nowFollowing) {
        toast.success(targetUserName ? `Following ${targetUserName}` : "Following")
      }
    } else {
      setFollowing(previousState)
      onStateChange?.(previousState)
      toast.error("Failed to update follow")
    }
    setLoading(false)
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        disabled={loading || currentUserId === targetUserId}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
          following
            ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
            : "bg-[#4F6EF7] text-white hover:bg-[#6B85FF]"
        } ${className}`}
      >
        {loading ? (
          <Loader2 size={10} className="animate-spin" />
        ) : following ? (
          "Following"
        ) : (
          "Follow"
        )}
      </button>
    )
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading || currentUserId === targetUserId}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        following
          ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          : "bg-[#4F6EF7] text-white hover:bg-[#6B85FF] shadow-[0_0_16px_rgba(37,99,235,0.12)]"
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <UserPlus size={16} />
      )}
      {following ? "Following" : "Follow"}
    </motion.button>
  )
}
