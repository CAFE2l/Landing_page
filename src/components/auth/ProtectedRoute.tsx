import { type ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const localUser = loadCurrentUser()

  const hasSession = !!session || !!localUser

  if (loading && !localUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020408]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
      </div>
    )
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
