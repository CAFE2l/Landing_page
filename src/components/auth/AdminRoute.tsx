import { type ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020408]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
