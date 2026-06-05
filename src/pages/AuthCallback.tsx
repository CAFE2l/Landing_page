import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import { ensureProfileFromAuthUser } from "../lib/supabaseProfile"
import { isAdminEmail } from "../lib/adminUsers"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      navigate("/login")
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await ensureProfileFromAuthUser(session.user)
        window.dispatchEvent(new Event("cafe-profile-updated"))
        const role = session.user.user_metadata?.role || session.user.app_metadata?.role
        if (role === "admin" || isAdminEmail(session.user.email)) {
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
