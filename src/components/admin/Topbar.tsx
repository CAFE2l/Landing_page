import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Bell, ChevronDown, User, Settings, ExternalLink, LogOut, Clock, MessageSquare, Users as UsersIcon, Star } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, getInitials, timeAgo } from "../../lib/utils"
import { supabase } from "../../lib/supabase/client"
import { useAuth } from "../../contexts/AuthContext"
import { useAdminStore } from "../../lib/store/adminStore"
import type { UserProfile } from "../../data/feedbackStore"

interface TopbarProps {
  title: string
  user?: UserProfile | null
}

interface SearchResult {
  clients: { id: string; full_name?: string; email?: string; avatar_url?: string }[]
  feedbacks: { id: string; title: string; service_category?: string; created_at: string }[]
}

export default function Topbar({ title, user }: TopbarProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed)

  // — Profile dropdown state —
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // — Notifications state —
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(true)
  const notifRef = useRef<HTMLDivElement>(null)

  // — Search state —
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult>({ clients: [], feedbacks: [] })
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ========== Close on outside click ==========
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ========== Notifications ==========
  interface NotificationItem {
    id: string
    type: string
    title: string
    message?: string
    read: boolean
    created_at: string
  }

  const fetchNotifications = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(10)
    setNotifications((data as NotificationItem[]) ?? [])
    setNotifLoading(false)
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    fetchNotifications()
  }, [notifOpen, fetchNotifications])

  const markAllNotificationsRead = async () => {
    if (!supabase) return
    await supabase.from("notifications").update({ read: true }).eq("read", false)
    setNotifications([])
  }

  const notifIcons: Record<string, typeof Bell> = {
    feedback: Star,
    client: UsersIcon,
    info: MessageSquare,
    warning: Clock,
  }

  // ========== Global search with debounce ==========
  useEffect(() => {
    if (query.length < 2) {
      setResults({ clients: [], feedbacks: [] })
      setSearchOpen(false)
      return
    }

    const timeout = setTimeout(async () => {
      setSearching(true)
      setSearchOpen(true)
      const [clientsRes, feedbacksRes] = await Promise.all([
        supabase!
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .eq("role", "client")
          .limit(5),
        supabase!
          .from("feedback_posts")
          .select("id, title, service_category, created_at")
          .ilike("title", `%${query}%`)
          .in("status", ["approved", "highlighted"])
          .limit(5),
      ])
      setResults({
        clients: (clientsRes?.data as SearchResult["clients"]) ?? [],
        feedbacks: (feedbacksRes?.data as SearchResult["feedbacks"]) ?? [],
      })
      setSearching(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  const handleLogout = async () => {
    setProfileOpen(false)
    await signOut()
    navigate("/")
  }

  const avatarUrl = user?.photoUrl
  const initials = getInitials(user?.name || "Admin")
  const hasAnyResult = results.clients.length > 0 || results.feedbacks.length > 0

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-20 flex h-16 items-center gap-4 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 transition-all duration-300",
        collapsed ? "left-16" : "left-60",
      )}
    >
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-semibold text-[#f0f0f5]"
      >
        {title}
      </motion.h1>

      <div className="flex-1" />

      {/* — Global Search — */}
      <div ref={searchRef} className="relative hidden sm:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 2) setSearchOpen(true) }}
          onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false) }}
          placeholder="Search..."
          className="h-9 w-64 rounded-lg border border-white/8 bg-white/5 pl-9 pr-3 text-sm text-[#f0f0f5] placeholder:text-white/30 outline-none focus:border-[#4f6ef7]/50 transition-all"
        />

        {/* Search results dropdown */}
        <AnimatePresence>
          {searchOpen && query.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl"
            >
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
                </div>
              ) : !hasAnyResult ? (
                <div className="px-4 py-8 text-center text-sm text-white/30">
                  Nenhum resultado para '<span className="text-white/50">{query}</span>'
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {results.clients.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Clientes</div>
                      {results.clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => { setSearchOpen(false); setQuery(""); navigate("/admin/clients") }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4f6ef7]/20 text-[9px] font-bold text-[#9BA7FF]">
                            {client.avatar_url ? <img src={client.avatar_url} alt="" className="h-full w-full object-cover" /> : getInitials(client.full_name || client.email || "C")}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-white">{client.full_name || client.email}</div>
                            {client.full_name && client.email && <div className="truncate text-[11px] text-white/40">{client.email}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.feedbacks.length > 0 && (
                    <div className="border-t border-white/[0.06]">
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Feedbacks</div>
                      {results.feedbacks.map((fb) => (
                        <button
                          key={fb.id}
                          onClick={() => { setSearchOpen(false); setQuery(""); navigate("/admin/feedback") }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f6ef7]/20 text-[9px] font-bold text-[#9BA7FF]">
                            <Star size={12} />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-white">{fb.title}</div>
                            <div className="truncate text-[11px] text-white/40">{fb.service_category}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* — Notifications — */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-white/50 transition-colors hover:text-white"
        >
          <Bell size={16} />
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4f6ef7] text-[9px] font-bold text-white">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <span className="text-sm font-semibold text-white">Notificações</span>
                {notifications.length > 0 && (
                  <button onClick={markAllNotificationsRead} className="text-[11px] text-[#4f6ef7] hover:text-[#6b85ff] transition-colors">
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Bell size={24} className="mb-2 text-white/20" />
                  <p className="text-sm text-white/30">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((notif) => {
                    const Icon = notifIcons[notif.type] || Bell
                    return (
                      <div key={notif.id} className="flex gap-3 border-b border-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.02]">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f6ef7]/15 text-[#9BA7FF]">
                          <Icon size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">{notif.title}</p>
                          {notif.message && <p className="mt-0.5 text-xs text-white/50">{notif.message}</p>}
                          <p className="mt-1 text-[10px] text-white/30">{timeAgo(notif.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* — Profile — */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-sm text-[#f0f0f5] transition-colors hover:bg-white/[0.08]"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] text-[10px] font-bold text-white">
              {initials}
            </div>
          )}
          <span className="hidden md:inline">{user?.name || "Admin"}</span>
          <ChevronDown size={14} className={`text-white/50 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl"
            >
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || "Admin"}</p>
                    <p className="truncate text-xs text-white/40">{user?.email || ""}</p>
                  </div>
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/admin/settings?tab=profile") }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <User size={16} />
                  Meu Perfil
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate("/admin/settings") }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Settings size={16} />
                  Configurações
                </button>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <ExternalLink size={16} />
                  Voltar ao Site
                </a>
              </div>

              <div className="border-t border-white/[0.06] p-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
