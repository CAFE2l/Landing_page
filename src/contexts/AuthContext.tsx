/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import { clearCurrentUser, saveCurrentUser } from "../data/feedbackStore"

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

function syncSessionToStorage(session: Session | null) {
  if (!session?.user) {
    return
  }

  const meta = session.user.user_metadata || {}
  saveCurrentUser({
    uid: session.user.id,
    name: meta.name || session.user.email?.split("@")[0] || "User",
    email: session.user.email || "",
    role: meta.role || "client",
    username: meta.username || undefined,
    company: meta.company || undefined,
    country: meta.country || undefined,
    photoUrl: meta.avatar_url || meta.photoUrl || undefined,
  })
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      syncSessionToStorage(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        syncSessionToStorage(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const user = session?.user ?? null
  const isAdmin = user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin"

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
