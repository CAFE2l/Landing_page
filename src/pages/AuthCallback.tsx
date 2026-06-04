import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase, supabaseConfigured } from "../lib/supabase/client"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      navigate("/login")
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const role = session.user.user_metadata?.role || session.user.app_metadata?.role
        if (role === "admin") {
          navigate("/admin/dashboard")
        } else {
          navigate("/")
        }
      } else {
        navigate("/login")
      }
    })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020408]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
        <p className="text-sm text-[#6b6b80]">Authenticating...</p>
      </div>
    </div>
  )
}
