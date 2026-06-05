import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import { ensureProfileFromAuthUser } from "../lib/supabaseProfile"
import { isAdminEmail } from "../lib/adminUsers"
import type { Session } from "@supabase/supabase-js"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      navigate("/login")
      return
    }

    let cancelled = false

    const handleSession = async (session: Session) => {
      if (cancelled) return
      await ensureProfileFromAuthUser(session.user)
      window.dispatchEvent(new Event("cafe-profile-updated"))
      const role = session.user.user_metadata?.role || session.user.app_metadata?.role
      if (role === "admin" || isAdminEmail(session.user.email)) {
        navigate("/admin/dashboard")
      } else {
        navigate("/")
      }
    }

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        handleSession(session)
        return
      }

      const hash = window.location.hash
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", ""))
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        if (accessToken) {
          const { data: { session } } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          })
          if (session) {
            handleSession(session)
            return
          }
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
            subscription.unsubscribe()
            handleSession(session)
          }
        }
      )
    }

    run()

    return () => {
      cancelled = true
    }
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
