import { useState, useEffect } from "react"
import { Outlet, Navigate, useLocation } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { useAdminStore } from "../../lib/store/adminStore"
import ConfirmModal from "./ConfirmModal"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"
import { supabase } from "../../lib/supabase/client"

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/feedback": "Feedback Management",
  "/admin/clients": "Clients",
  "/admin/forum": "Forum",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
  "/admin/service-orders": "Service Orders",
}

export default function AdminShell() {
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed)
  const confirmModal = useAdminStore((s) => s.ui.confirmModal)
  const hideConfirm = useAdminStore((s) => s.hideConfirm)
  const location = useLocation()
  const title = pageTitles[location.pathname] || "Admin"
  const { user: supabaseUser, isAdmin: supabaseAdmin, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<{ avatar_url?: string; full_name?: string; email?: string } | null>(null)

  useEffect(() => {
    if (!supabaseUser?.id || !supabase) return
    supabase
      .from("profiles")
      .select("avatar_url, full_name, email")
      .eq("id", supabaseUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as { avatar_url?: string; full_name?: string; email?: string })
      })
  }, [supabaseUser?.id])

  const storedUser = loadCurrentUser()
  const user = storedUser || (supabaseUser ? {
    uid: supabaseUser.id,
    name: profile?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "Admin",
    email: profile?.email || supabaseUser.email || "",
    role: supabaseAdmin ? "admin" as const : "client" as const,
    photoUrl: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.photoUrl || "",
  } : null)
  const isAdmin = user?.role === "admin" || supabaseAdmin

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020408]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
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
