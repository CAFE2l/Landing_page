import { useState } from "react"
import { cn, getInitials, getUserDisplayName, getUserAvatar } from "../../lib/utils"

interface UserAvatarProps {
  user?: {
    avatarUrl?: string | null
    avatar_url?: string | null
    photoUrl?: string | null
    photoURL?: string | null
    fullName?: string | null
    full_name?: string | null
    displayName?: string | null
    name?: string | null
    username?: string | null
    email?: string | null
  } | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  ring?: boolean
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-2xl",
}

const ringMap = {
  sm: "ring-1 ring-white/[0.06]",
  md: "ring-1 ring-white/[0.06]",
  lg: "ring-1 ring-white/[0.1]",
  xl: "ring-1 ring-white/[0.12]",
}

export default function UserAvatar({ user, size = "md", className, ring = true }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const avatarUrl = getUserAvatar(user)
  const displayName = getUserDisplayName(user)
  const initials = displayName ? getInitials(displayName) : "?"

  if (avatarUrl && !imgError) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full",
          sizeMap[size],
          ring && ringMap[size],
          className,
        )}
      >
        <img
          src={avatarUrl}
          alt={displayName}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 font-bold text-[#4F6EF7]",
        sizeMap[size],
        ring && ringMap[size],
        className,
      )}
    >
      {initials}
    </div>
  )
}
