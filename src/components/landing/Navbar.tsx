"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import WhatsAppIcon from "./WhatsAppIcon"

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
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = location.pathname === "/"

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
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
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

        <motion.a
          href="https://wa.me/5511999999999"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="hidden lg:inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#3b82f6]/40 shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300"
        >
          <WhatsAppIcon />
          Talk to me
        </motion.a>

        <button
          className="lg:hidden text-zinc-400 p-2"
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
            <div className="container mx-auto px-6 py-6 flex flex-col gap-3">
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
              <motion.a
              href="https://wa.me/5511999999999"
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
