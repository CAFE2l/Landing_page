import { Outlet, Navigate, useLocation } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { useAdminStore } from "../../lib/store/adminStore"
import ConfirmModal from "./ConfirmModal"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/feedback": "Feedback",
  "/admin/clients": "Clients",
  "/admin/forum": "Forum",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
}

export default function AdminShell() {
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed)
  const confirmModal = useAdminStore((s) => s.ui.confirmModal)
  const hideConfirm = useAdminStore((s) => s.hideConfirm)
  const location = useLocation()
  const title = pageTitles[location.pathname] || "Admin"
  const { isAdmin: supabaseAdmin } = useAuth()

  const user = loadCurrentUser()
  const isAdmin = user?.role === "admin" || supabaseAdmin

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="min-h-screen bg-admin-gradient text-[#f0f0f5]">
      <Sidebar />
      <Topbar title={title} user={user} />
      <main
        className="pt-16 pb-12 transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#f0f0f5",
            borderRadius: "12px",
          },
        }}
      />
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); hideConfirm() }}
          onCancel={hideConfirm}
        />
      )}
    </div>
  )
}
