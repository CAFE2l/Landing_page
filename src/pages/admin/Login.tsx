import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"

import { loadCurrentUser, saveCurrentUser } from "../../data/feedbackStore"
import { supabase, supabaseConfigured } from "../../lib/supabase/client"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const existing = loadCurrentUser()
    if (existing && existing.role === "admin") {
      navigate("/admin/dashboard", { replace: true })
      return
    }
    if (supabase && supabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const role = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role
        if (role === "admin") {
          navigate("/admin/dashboard", { replace: true })
        }
      })
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    if (!supabase || !supabaseConfigured) {
      toast.error("Supabase authentication is not configured.")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) throw error
      if (!data.user) throw new Error("Could not sign in.")

      const meta = data.user.user_metadata || {}
      const role = meta.role || "client"

      if (role !== "admin") {
        await supabase.auth.signOut()
        toast.error("Access denied. This account is not an admin.")
        return
      }

      const profile = {
        uid: data.user.id,
        name: meta.name || data.user.email?.split("@")[0] || email,
        email: data.user.email || email,
        role: "admin" as const,
        username: meta.username || undefined,
        company: meta.company || undefined,
        country: meta.country || undefined,
        photoUrl: meta.avatar_url || meta.photoUrl || undefined,
      }
      saveCurrentUser(profile)

      toast.success(`Welcome back, ${profile.name}!`)
      navigate("/admin/dashboard")
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message.includes("Invalid login credentials")
            ? "Invalid email or password."
            : error.message
          : "Could not authenticate. Try again."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-admin-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4f6ef7]">
              <img src="/favicon.png" alt="CAFÉ" className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-[#f0f0f5]">Admin Login</h1>
            <p className="mt-1 text-sm text-[#6b6b80]">Café Services Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cafeservices.com"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-10 pr-3 py-2.5 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-10 pr-10 py-2.5 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b80] hover:text-[#f0f0f5]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#4f6ef7] py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-xs text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
              Back to site
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#3a3a4a]">
          Admin access only. Unauthorized access is prohibited.
        </p>
      </motion.div>
    </div>
  )
}
