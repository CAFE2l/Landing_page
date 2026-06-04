import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck, Sparkles, User } from "lucide-react"
import { motion } from "framer-motion"
import AuthBackground from "../components/auth/AuthBackground"
import { saveCurrentUser, type UserProfile, type UserRole } from "../data/feedbackStore"

interface AuthPageProps {
  mode: "login" | "signup"
  onAuth: (user: UserProfile) => void
}

export default function AuthPage({ mode, onAuth }: AuthPageProps) {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const isSignup = mode === "signup"
  const adminEmail = "gutiajs@gmail.com"

  const finishAuth = (userEmail: string, userName?: string) => {
    const normalizedEmail = userEmail.trim().toLowerCase()
    const role: UserRole = normalizedEmail === adminEmail ? "admin" : "client"
    const user = {
      name: userName || (role === "admin" ? "Admin" : "Client"),
      email: normalizedEmail || (role === "admin" ? adminEmail : "client@company.com"),
      role,
      company: isSignup && company.trim() ? company.trim() : undefined,
    }
    saveCurrentUser(user)
    onAuth(user)
    navigate(role === "admin" ? "/admin" : "/profile")
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    finishAuth(email || "client@company.com", isSignup ? name || "Client" : undefined)
  }

  const handleGoogleAuth = () => {
    finishAuth(email || "google@cafeservices.dev", isSignup ? name || "Google User" : undefined)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020408] px-6 py-8 text-white">
      <AuthBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="CAFÉ SERVICES" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-bold tracking-tight text-white sm:text-base">
              CAFÉ<span className="text-[#3b82f6]"> SERVICES</span>
            </span>
          </Link>
          <Link to="/" className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-400 backdrop-blur-xl transition-colors hover:border-[#3b82f6]/30 hover:text-white">
            Back to site
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_460px]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hidden max-w-xl lg:block"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/20 bg-[#2563eb]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
              <Sparkles size={14} />
              Secure client portal
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white">
              {isSignup ? "Create access to your project feedback hub." : "Enter your private project workspace."}
            </h1>
            <p className="mb-8 text-base leading-relaxed text-zinc-500">
              Manage feedback, project stories, media references, and approved client posts from a focused digital workspace.
            </p>
            <div className="grid gap-3">
              {["Encrypted session handoff", "Admin roles are managed from the dashboard", "Feedback workflow ready for backend data"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-sm text-zinc-400 backdrop-blur">
                  <ShieldCheck size={17} className="text-[#60a5fa]" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-[460px]"
          >
            <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-[#3b82f6]/50 via-white/[0.08] to-transparent opacity-80" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#050a12]/80 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.5),0_0_60px_rgba(37,99,235,0.14)] backdrop-blur-2xl sm:p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#60a5fa]/70 to-transparent" />
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#2563eb]/10 blur-3xl" />

              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3b82f6]/25 bg-[#2563eb]/10 text-[#60a5fa] shadow-[0_0_24px_rgba(37,99,235,0.2)]">
                  <LockKeyhole size={22} />
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#60a5fa]">
                  {isSignup ? "Client access" : "Secure area"}
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  {isSignup ? "Create account" : "Welcome back"}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {isSignup
                    ? "Open your feedback profile and submit project results for review."
                    : "Login to continue to your workspace and manage feedback access."}
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[#3b82f6]/35 hover:bg-white/[0.07]"
                >
                  <img src="/imgs/icons/Google.png" alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                  {isSignup ? "Sign up with Google" : "Login with Google"}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-white/[0.08]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-700">or continue with email</span>
                  <span className="h-px flex-1 bg-white/[0.08]" />
                </div>

                {isSignup && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Full name</span>
                    <span className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5 transition-colors focus-within:border-[#3b82f6]/50 focus-within:bg-[#020408]/70">
                      <User size={18} className="text-zinc-500" />
                      <input value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700" placeholder="Client name" />
                    </span>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</span>
                  <span className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5 transition-colors focus-within:border-[#3b82f6]/50 focus-within:bg-[#020408]/70">
                    <Mail size={18} className="text-zinc-500" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700" placeholder="client@company.com" />
                  </span>
                </label>

                {isSignup && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Company <span className="font-medium tracking-normal text-zinc-700">(optional)</span></span>
                    <span className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5 transition-colors focus-within:border-[#3b82f6]/50 focus-within:bg-[#020408]/70">
                      <Building2 size={18} className="text-zinc-500" />
                      <input value={company} onChange={(event) => setCompany(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700" placeholder="Company name, if you have one" />
                    </span>
                  </label>
                )}

                <button className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#3b82f6]/50 bg-[#2563eb] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.38)] transition-all hover:bg-[#1d4ed8] hover:shadow-[0_0_42px_rgba(37,99,235,0.48)]">
                  {isSignup ? "Create account" : "Login"}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-600">
                {isSignup ? "Already have access?" : "Need an account?"}{" "}
                <Link to={isSignup ? "/login" : "/signup"} className="font-semibold text-[#60a5fa] transition-colors hover:text-white">
                  {isSignup ? "Login" : "Create one"}
                </Link>
              </p>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  )
}
