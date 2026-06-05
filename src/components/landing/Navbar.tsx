"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, MessageCircle, X } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import WhatsAppIcon from "./WhatsAppIcon"
import UserMenu from "../auth/UserMenu"
import { useAuth } from "../../contexts/AuthContext"
import { wa, WA_MESSAGES } from "../../lib/utils"
import { getUnreadMessageCount } from "../../data/feedbackServiceSupabase"
import { supabase } from "../../lib/supabase/client"

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
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = location.pathname === "/"

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => setUnreadMessages(0))
      return
    }
    const refresh = () => getUnreadMessageCount(user.id).then(setUnreadMessages).catch(() => setUnreadMessages(0))
    refresh()
    const client = supabase
    if (!client) return
    const channel = client
      .channel(`navbar-messages:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .subscribe()
    return () => {
      client.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 30)

      const sections = links.filter((l) => l.href.startsWith("#")).map((l) => l.href.slice(1))
      for (const id of sections.reverse()) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= y + 200) {
          setActive(id)
          return
        }
      }
      setActive("")
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" as const }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#020408]/80 backdrop-blur-xl border-b border-white/[0.08] py-3"
          : "bg-transparent py-4 md:py-5"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.02 }}
        >
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="CAFÉ SERVICES"
            className="w-8 h-8 rounded-lg"
          />
          <span className="text-xl font-bold text-white tracking-tight">
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
                  className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full transition-all duration-300 ${
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
          )}
          <UserMenu />
          <motion.a
            href={wa(WA_MESSAGES.general)}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300"
          >
            <WhatsAppIcon />
            Talk to me
          </motion.a>
        </div>

          <button
            className="lg:hidden text-zinc-400 p-3 -mr-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#020408]/95 backdrop-blur-xl border-t border-white/[0.08] overflow-hidden"
          >
            <div className="container mx-auto px-4 sm:px-6 py-6 flex flex-col gap-3">
              {links.map((link) => {
                const isActive = isLanding && active === link.href.slice(1)
                return (
                  <button
                    key={link.href}
                    onClick={() => handleClick(link.href)}
                    className={`text-left text-base font-medium transition-colors py-2 ${
                      isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {link.name}
                  </button>
                )
              })}

              <div className="mt-4 border-t border-white/[0.08] pt-4">
                {user ? (
                  <div className="space-y-2">
                    {[
                      { label: "My Profile", href: "/dashboard/profile" },
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
                        className={`block text-left text-base font-medium transition-colors py-2 ${
                          item.label === "Admin Panel" ? "text-[#3b82f6]" : "text-zinc-500 hover:text-zinc-200"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => { setOpen(false); signOut(); navigate("/") }}
                      className="block text-left text-base font-medium text-zinc-500 hover:text-red-400 transition-colors py-2"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="block text-center text-base font-medium text-zinc-300 hover:text-white border border-white/[0.08] rounded-xl px-6 py-3 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="block text-center text-base font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl px-6 py-3 border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>

              <motion.a
          href={wa(WA_MESSAGES.general)}
          target="_blank"
          rel="noopener noreferrer"
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 text-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 py-3 rounded-xl text-sm font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] mt-2"
              >
              <WhatsAppIcon />
              Talk to me
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
