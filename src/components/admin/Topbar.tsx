import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  ExternalLink,
  LogOut,
  Clock,
  MessageSquare,
  Users as UsersIcon,
  Star,
  ClipboardList,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, timeAgo } from "../../lib/utils";
import UserAvatar from "../ui/UserAvatar";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminStore } from "../../lib/store/adminStore";
import { subscribeToNotifications } from "../../lib/serviceOrdersService";
import { useUserProfile } from "../../hooks/useUserProfile";
import toast from "react-hot-toast";

interface TopbarProps {
  title: string;
  userId?: string;
  onMenuClick?: () => void;
}

interface SearchResult {
  clients: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  }[];
  feedbacks: {
    id: string;
    title: string;
    service_category?: string;
    created_at: string;
  }[];
}

export default function Topbar({ title, userId, onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  const { profile } = useUserProfile(userId || authUser?.id);
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed);

  // — Profile dropdown state —
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // — Notifications state —
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  // — Search state —
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    clients: [],
    feedbacks: [],
  });
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ========== Close on outside click ==========
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ========== Notifications ==========
  interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message?: string;
    is_read: boolean;
    created_at: string;
  }

  const fetchNotifications = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);
    const items = (data as NotificationItem[]) ?? [];
    setNotifications(items);
    setNotifLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    const cleanup = subscribeToNotifications(() => {
      fetchNotifications();
      playNotificationSound();
      toast.custom(
        () => (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-3 shadow-2xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
              <Bell size={14} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">New notification</p>
              <p className="text-xs text-zinc-500">
                A new service order or update arrived
              </p>
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    });
    return () => {
      cleanup();
    };
  }, [fetchNotifications]);

  const markAllNotificationsRead = async () => {
    if (!supabase) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    setNotifications([]);
  };

  const notifIcons: Record<string, typeof Bell> = {
    feedback: Star,
    client: UsersIcon,
    info: MessageSquare,
    warning: Clock,
    new_service_order: ClipboardList,
    order_status: ClipboardList,
  };

  // ========== Global search with debounce ==========
  useEffect(() => {
    if (query.length < 2) {
      setResults({ clients: [], feedbacks: [] });
      setSearchOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchOpen(true);
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
      ]);
      setResults({
        clients: (clientsRes?.data as SearchResult["clients"]) ?? [],
        feedbacks: (feedbacksRes?.data as SearchResult["feedbacks"]) ?? [],
      });
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await signOut();
    navigate("/");
  };

  const name = profile?.full_name || "Admin";
  const hasAnyResult =
    results.clients.length > 0 || results.feedbacks.length > 0;

  function playNotificationSound() {
    try {
      const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-20 flex h-16 items-center gap-3 border-b border-white/5 bg-[#0a0a0f]/90 px-3 backdrop-blur-md transition-all duration-300 sm:px-4 md:gap-4 md:px-6",
        collapsed ? "left-0 md:left-16" : "left-0 md:left-60",
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/70 md:hidden touch-target"
        aria-label="Open admin menu"
      >
        <Menu size={18} />
      </button>
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-w-0 truncate text-base font-semibold text-[#f0f0f5] sm:text-lg"
      >
        {title}
      </motion.h1>

      <div className="flex-1" />

      {/* — Global Search — */}
      <div ref={searchRef} className="relative hidden min-[390px]:block">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setSearchOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearchOpen(false);
          }}
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-white/8 bg-white/5 pl-9 pr-3 text-sm text-[#f0f0f5] placeholder:text-white/30 outline-none transition-all focus:border-[#4f6ef7]/50 sm:w-56 lg:w-64"
        />

        {/* Search results dropdown */}
        <AnimatePresence>
          {searchOpen && query.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-80 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl sm:w-80"
            >
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
                </div>
              ) : !hasAnyResult ? (
                <div className="px-4 py-8 text-center text-sm text-white/30">
                  No results for '<span className="text-white/50">{query}</span>
                  '
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {results.clients.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                        Clients
                      </div>
                      {results.clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setSearchOpen(false);
                            setQuery("");
                            navigate("/admin/clients");
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
                        >
                          <UserAvatar user={client} size="sm" className="h-7 w-7" ring={false} />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-white">
                              {client.full_name || client.email}
                            </div>
                            {client.full_name && client.email && (
                              <div className="truncate text-[11px] text-white/40">
                                {client.email}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.feedbacks.length > 0 && (
                    <div className="border-t border-white/[0.06]">
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                        Feedbacks
                      </div>
                      {results.feedbacks.map((fb) => (
                        <button
                          key={fb.id}
                          onClick={() => {
                            setSearchOpen(false);
                            setQuery("");
                            navigate("/admin/feedback");
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f6ef7]/20 text-[9px] font-bold text-[#9BA7FF]">
                            <Star size={12} />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-white">
                              {fb.title}
                            </div>
                            <div className="truncate text-[11px] text-white/40">
                              {fb.service_category}
                            </div>
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
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-white/50 transition-colors hover:text-white touch-target"
          aria-label="Notifications"
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
              className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-80 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl sm:w-80"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <span className="text-sm font-semibold text-white">
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-[#4f6ef7] hover:text-[#6b85ff] transition-colors"
                  >
                    Mark all as read
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
                  <p className="text-sm text-white/30">No notifications</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((notif) => {
                    const Icon = notifIcons[notif.type] || Bell;
                    return (
                      <div
                        key={notif.id}
                        className="flex gap-3 border-b border-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.02]"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f6ef7]/15 text-[#9BA7FF]">
                          <Icon size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">
                            {notif.title}
                          </p>
                          {notif.message && (
                            <p className="mt-0.5 text-xs text-white/50">
                              {notif.message}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-white/30">
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                      </div>
                    );
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
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-2 text-sm text-[#f0f0f5] transition-colors hover:bg-white/[0.08] sm:px-3 touch-target"
          aria-label="Admin profile menu"
          aria-expanded={profileOpen}
        >
          <UserAvatar user={profile} size="sm" className="h-6 w-6" ring={false} />
          <span className="hidden md:inline">{name}</span>
          <ChevronDown
            size={14}
            className={`text-white/50 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-64 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl sm:w-64"
            >
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={profile} size="md" className="h-9 w-9" ring={false} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {name}
                    </p>
                    <p className="truncate text-xs text-white/40">
                      {profile?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/admin/settings?tab=profile");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <User size={16} />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/admin/settings");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <ExternalLink size={16} />
                  Back to Site
                </a>
              </div>

              <div className="border-t border-white/[0.06] p-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
