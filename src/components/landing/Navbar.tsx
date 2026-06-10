"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Bell, Menu, MessageCircle, X } from "lucide-react"
import NotificationDropdown from "../notifications/NotificationDropdown"
import { Link, useLocation, useNavigate } from "react-router-dom"
import WhatsAppIcon from "./WhatsAppIcon"
import UserMenu from "../auth/UserMenu"
import { useAuth } from "../../contexts/AuthContext"
import { wa, WA_MESSAGES } from "../../lib/utils"
import { getGlobalUnreadCount } from "../../lib/chatService"
import { fetchUnreadCount } from "../../lib/userNotificationService"
import { supabase } from "../../lib/supabase/client"
import { useIsMobile } from "../../hooks/useMobile"

const links = [
  { name: "Services", href: "#services" },
  { name: "Process", href: "#process" },
  { name: "Work", href: "#work" },
  { name: "Feedbacks", href: "/feedback" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState("")
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = location.pathname === "/"
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => { setUnreadMessages(0); setUnreadNotifications(0) })
      return
    }
    const refresh = () => getGlobalUnreadCount().then(setUnreadMessages).catch(() => setUnreadMessages(0))
    const refreshNotifs = () => fetchUnreadCount(user.id).then(setUnreadNotifications).catch(() => setUnreadNotifications(0))
    refresh()
    refreshNotifs()
    const client = supabase
    if (!client) return
    const channel = client
      .channel(`navbar-messages:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, refresh)
      .subscribe()
    const notifChannel = client
      .channel(`navbar-notifications:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, refreshNotifs)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, refreshNotifs)
      .subscribe()
    return () => {
      client.removeChannel(channel)
      client.removeChannel(notifChannel)
    }
  }, [user?.id])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30)
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const sectionIds = links.filter((l) => l.href.startsWith("#")).map((l) => l.href.slice(1))
    const observers: IntersectionObserver[] = []
    if (isLanding) {
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setActive(id)
          },
          { rootMargin: "-200px 0px -50% 0px" }
        )
        observer.observe(el)
        observers.push(observer)
      }
    }

    return () => {
      window.removeEventListener("scroll", onScroll)
      observers.forEach((o) => o.disconnect())
    }
  }, [isLanding])

  const handleClick = (href: string) => {
    setOpen(false)
    if (href.startsWith("/")) {
      navigate(href)
      return
    }
    const id = href.slice(1)
    if (!isLanding) {
      navigate(`/${href}`)
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: isMobile ? 0.3 : 0.5, ease: "easeOut" as const }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-[#020408]/80 backdrop-blur-xl border-b border-white/[0.08] py-3"
            : "bg-transparent py-4 md:py-5"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6">
          <motion.div whileHover={isMobile ? undefined : { scale: 1.02 }}>
            <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
              <img
                src="/favicon.png"
                alt="CAFÉ SERVICES"
                className="h-8 w-8 shrink-0 rounded-lg"
              />
              <span className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                CAFÉ<span className="text-[#3b82f6]"> SERVICES</span>
              </span>
            </Link>
          </motion.div>

          <div className="hidden lg:flex items-center gap-1">
            {links.map((link) => {
              const isActive = isLanding && active === link.href.slice(1)
              return (
                <button
                  key={link.href}
                  onClick={() => handleClick(link.href)}
                  className="relative px-4 py-2 text-sm font-medium transition-colors duration-200 group"
                >
                  <span className={isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-200"}>
                    {link.name}
                  </span>
                  <span
                    className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full transition-all duration-200 ${
                      isActive
                        ? "bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        : "bg-transparent group-hover:bg-zinc-600 scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </button>
              )
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user && (
              <>
                <NotificationDropdown />
                <Link
                  to="/dashboard/messages"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition-all hover:border-[#3b82f6]/35 hover:text-white"
                  aria-label="Messages"
                >
                  <MessageCircle size={17} />
                  {unreadMessages > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </>
            )}
            <UserMenu />
            <motion.a
              href={wa(WA_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={isMobile ? undefined : { scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300"
            >
              <WhatsAppIcon />
              Talk to me
            </motion.a>
          </div>
        </div>
      </motion.nav>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around gap-2 border-t border-white/[0.08] bg-[#05070c]/95 px-3 py-2 backdrop-blur-2xl lg:hidden safe-bottom">
        <motion.a
          href={wa(WA_MESSAGES.general)}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.97 }}
          className="touch-target inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.28)]"
          aria-label="Talk to me on WhatsApp"
        >
          <WhatsAppIcon />
          <span className="truncate max-[399px]:hidden">Talk to me</span>
        </motion.a>

        {user && (
          <>
            <Link
              to="/dashboard/notifications"
              className="touch-target relative flex items-center justify-center rounded-2xl text-zinc-300"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
            >
              <Bell size={22} />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <Link
              to="/dashboard/messages"
              className="touch-target relative flex items-center justify-center rounded-2xl text-zinc-300"
              aria-label={`Messages${unreadMessages > 0 ? ` (${unreadMessages} unread)` : ""}`}
            >
              <MessageCircle size={22} />
              {unreadMessages > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
          </>
        )}

        <button
          className="touch-target flex items-center justify-center rounded-2xl text-zinc-300"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={isMobile ? { duration: 0.2, ease: "easeOut" } : { type: "spring", stiffness: 300, damping: 30 }}
              className="safe-bottom absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] border-t border-white/[0.1] bg-[#05070c]/95 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
              </div>

              <div className="px-3 pb-4">
                <div className="grid gap-1">
                  {links.map((link) => {
                    const isActive = isLanding && active === link.href.slice(1)
                    return (
                      <button
                        key={link.href}
                        onClick={() => handleClick(link.href)}
                        className={`touch-target flex min-h-12 items-center justify-between rounded-2xl px-4 text-left text-base font-semibold transition-colors ${
                          isActive ? "bg-[#3b82f6]/14 text-white" : "text-zinc-300 hover:bg-white/[0.05]"
                        }`}
                      >
                        {link.name}
                        <ArrowRight size={16} className="text-white/30" />
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 border-t border-white/[0.08] pt-3">
                  {user ? (
                    <div className="grid gap-1">
                      {[
                        { label: "My Profile", href: "/dashboard/profile" },
                        { label: unreadNotifications > 0 ? `Notifications (${unreadNotifications})` : "Notifications", href: "/dashboard/notifications" },
                        { label: unreadMessages > 0 ? `Messages (${unreadMessages})` : "Messages", href: "/dashboard/messages" },
                        { label: "My Posts", href: "/dashboard/posts" },
                        { label: "Saved Posts", href: "/dashboard/saved" },
                        { label: "Settings", href: "/dashboard/settings" },
                        ...(isAdmin ? [{ label: "Admin Panel", href: "/admin" }] : []),
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className={`touch-target flex min-h-12 items-center justify-between rounded-2xl px-4 text-base font-semibold transition-colors ${
                            item.label === "Admin Panel" ? "bg-[#3b82f6]/10 text-[#7EA1FF]" : "text-zinc-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          {item.label}
                          <ArrowRight size={16} className="text-white/30" />
                        </Link>
                      ))}
                      <button
                        onClick={() => { setOpen(false); signOut(); navigate("/") }}
                        className="touch-target flex min-h-12 items-center rounded-2xl px-4 text-left text-base font-semibold text-red-300/80 hover:bg-red-500/10"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="touch-target flex min-h-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 text-base font-semibold text-zinc-200"
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setOpen(false)}
                        className="touch-target flex min-h-12 items-center justify-center rounded-2xl bg-[#2563eb] px-5 text-base font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.28)]"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
