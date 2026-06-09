import { useState, useEffect } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ExternalLink, LayoutDashboard, MessageSquare, Users, BarChart3, Settings, LogOut, ClipboardList } from "lucide-react"
import { cn } from "../../lib/utils"
import { useAdminStore } from "../../lib/store/adminStore"
import { useAuth } from "../../contexts/AuthContext"
import { getPendingFeedbackCount } from "../../data/feedbackServiceSupabase"

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { path: "/admin/clients", label: "Clients", icon: Users },
  { path: "/admin/service-orders", label: "Orders", icon: ClipboardList },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/settings", label: "Settings", icon: Settings },
]

export default function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    getPendingFeedbackCount().then(setPendingCount)

    const interval = setInterval(() => {
      getPendingFeedbackCount().then(setPendingCount)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    onNavigate?.()
    await signOut()
    navigate("/admin/login")
  }

  const compact = mobile ? false : collapsed

  return (
    <motion.aside
      initial={false}
      animate={{ width: compact ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "flex h-full flex-col overflow-hidden border-r border-white/5 bg-[#0a0a0f]",
        mobile ? "relative w-60" : "fixed left-0 top-0 z-30 h-screen",
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 shrink-0">
        <a href="/" className="flex items-center gap-3">
          <img src="/favicon.png" alt="CAFÉ" className="h-7 w-7 rounded-lg" />
          {!compact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-sm font-bold text-transparent">CAFÉ</span>
              <span className="text-[10px] font-semibold text-[#4f6ef7]">ADMIN</span>
            </motion.div>
          )}
        </a>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const showBadge = item.path === "/admin/feedback" && pendingCount > 0
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className="relative block"
            >
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                  isActive
                    ? "bg-white/[0.08] text-white border-l-2 border-blue-500 rounded-none pl-[10px]"
                    : "text-white/50 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!compact && (
                  <span>{item.label}</span>
                )}
                {showBadge && (
                  <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#4f6ef7] px-1.5 text-[10px] font-bold text-white ${collapsed ? "absolute -right-1 -top-1" : ""}`}>
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/5 px-3 py-4 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 text-white/50 hover:bg-white/5 hover:text-white",
            compact && "justify-center px-0",
          )}
        >
          <ExternalLink size={18} className="shrink-0" />
          {!compact && <span>View Site</span>}
        </a>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/50 transition-colors duration-150 hover:bg-white/5 hover:text-red-400"
        >
          <LogOut size={18} className="shrink-0" />
          {!compact && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  )
}
