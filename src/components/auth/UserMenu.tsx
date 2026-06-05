import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { User, Settings, Bookmark, FileText, LogOut, Shield, ChevronDown, MessageCircle } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { getInitials } from "../../lib/utils"
import { loadCurrentUser, saveCurrentUser } from "../../data/feedbackStore"
import { supabase } from "../../lib/supabase/client"

const dropdownItems = [
  { label: "My Profile", href: "/dashboard/profile", icon: User },
  { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
  { label: "My Posts", href: "/dashboard/posts", icon: FileText },
  { label: "Saved Posts", href: "/dashboard/saved", icon: Bookmark },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

const adminItem = { label: "Admin Panel", href: "/admin", icon: Shield }

export default function UserMenu() {
  const { user, loading, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileAvatar, setProfileAvatar] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const refreshProfile = () => {
    const stored = loadCurrentUser()
    setProfileName(stored?.name || user.email?.split("@")[0] || "User")
    setProfileAvatar(stored?.photoUrl || "")

    if (!supabase) return
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setProfileName(data.full_name || user.email?.split("@")[0] || "User")
        setProfileAvatar(data.avatar_url || "")
        // Sync DB data back to localStorage
        const current = loadCurrentUser()
        if (current) {
          saveCurrentUser({ ...current, name: data.full_name || current.name, photoUrl: data.avatar_url || current.photoUrl })
        }
      })
    }
    refreshProfile()
    window.addEventListener("cafe-profile-updated", refreshProfile)
    return () => window.removeEventListener("cafe-profile-updated", refreshProfile)
  }, [user?.id, user?.email])

  const name = profileName || user?.email?.split("@")[0] || "User"
  const avatarUrl = profileAvatar
  const initials = getInitials(name)

  const handleLogout = async () => {
    setOpen(false)
    await signOut()
    navigate("/")
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse hidden sm:block" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="relative px-4 py-2 text-sm font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg border border-[#3b82f6]/40 shadow-[0_0_12px_rgba(37,99,235,0.25)] transition-all duration-300"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 group"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#3b82f6]/50 transition-all"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/10 group-hover:ring-[#3b82f6]/50 transition-all">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-zinc-300 group-hover:text-white transition-colors max-w-[120px] truncate">
          {name}
        </span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-56 origin-top-right z-50"
          >
            <div className="bg-[#020408]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
              <div className="p-2">
                {dropdownItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <item.icon size={16} className="text-zinc-500" />
                    {item.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to={adminItem.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#3b82f6] hover:text-white hover:bg-[#2563eb]/10 rounded-lg transition-all"
                  >
                    <Shield size={16} />
                    {adminItem.label}
                  </Link>
                )}
              </div>
              <div className="border-t border-white/[0.08] p-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
