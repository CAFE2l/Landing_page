/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import { clearCurrentUser } from "../data/feedbackStore"
import { isAdminEmail } from "../lib/adminUsers"
import { ensureProfileFromAuthUser } from "../lib/supabaseProfile"

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
})

async function syncSessionToStorage(session: Session | null) {
  if (!session?.user) {
    return
  }
  await ensureProfileFromAuthUser(session.user)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await syncSessionToStorage(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await syncSessionToStorage(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const user = session?.user ?? null
  const isAdmin = user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin" || isAdminEmail(user?.email)

  const signOut = async () => {
    if (!supabase || !supabaseConfigured) return
    clearCurrentUser()
    await supabase.auth.signOut()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
