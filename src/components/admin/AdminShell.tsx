import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAdminStore } from "../../lib/store/adminStore";
import ConfirmModal from "./ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/feedback": "Feedback Management",
  "/admin/clients": "Clients",
  "/admin/forum": "Forum",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
  "/admin/service-orders": "Service Orders",
};

export default function AdminShell() {
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed);
  const confirmModal = useAdminStore((s) => s.ui.confirmModal);
  const hideConfirm = useAdminStore((s) => s.hideConfirm);
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Admin";
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020408]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="mobile-page bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="h-full w-72 max-w-[86vw]"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              onClick={(event) => event.stopPropagation()}
            >
              <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Topbar title={title} userId={user.id} onMenuClick={() => setMobileMenuOpen(true)} />
      <main
        className={`min-w-0 pt-16 pb-12 safe-bottom transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-60"}`}
      >
        <div className="min-w-0 p-3 sm:p-5 md:p-6">
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
          variant={confirmModal.variant ?? "default"}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={() => {
            confirmModal.onConfirm();
            hideConfirm();
          }}
          onCancel={hideConfirm}
        />
      )}
    </div>
  );
}
