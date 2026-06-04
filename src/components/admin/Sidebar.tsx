import { useState, useEffect } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  LayoutDashboard, MessageSquare, Users, BarChart3, Settings, LogOut, MessageCircle,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { useAdminStore } from "../../lib/store/adminStore"
import { useAuth } from "../../contexts/AuthContext"
import { getPendingFeedbackCount } from "../../data/feedbackServiceSupabase"

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { path: "/admin/clients", label: "Clients", icon: Users },
  { path: "/admin/forum", label: "Forum", icon: MessageCircle },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
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
    await signOut()
    navigate("/admin/login")
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-white/[0.08] bg-[#050508] overflow-hidden"
    >
      <div className="flex h-16 items-center gap-3 px-4 shrink-0">
        <img src="/favicon.png" alt="CAFÉ" className="h-7 w-7 rounded-lg" />
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            <span className="text-sm font-bold text-[#f0f0f5]">CAFÉ</span>
            <span className="text-[10px] font-semibold text-[#4f6ef7]">ADMIN</span>
          </motion.div>
        )}
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
              className="relative block"
            >
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                  isActive
                    ? "bg-white/[0.06] text-[#f0f0f5]"
                    : "text-[#6b6b80] hover:bg-white/[0.03] hover:text-[#f0f0f5]",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg border border-white/[0.08] bg-white/[0.04]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={18} className="relative z-10 shrink-0" />
                {!collapsed && (
                  <span className="relative z-10">{item.label}</span>
                )}
                {showBadge && (
                  <span className={`relative z-10 ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#4f6ef7] px-1.5 text-[10px] font-bold text-white ${collapsed ? "absolute -right-1 -top-1" : ""}`}>
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.08] px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#6b6b80] transition-colors hover:bg-white/[0.03] hover:text-red-400"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  )
}
