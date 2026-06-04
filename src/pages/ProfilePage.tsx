import { useEffect, useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Lock,
  Save,
  Shield,
  ShoppingBag,
  Smartphone,
  User,
  Wrench,
} from "lucide-react"
import AuthBackground from "../components/auth/AuthBackground"
import Navbar from "../components/landing/Navbar"
import { getInitials, type FeedbackEntry, type UserProfile } from "../data/feedbackStore"

interface ProfilePageProps {
  user: UserProfile | null
  onSubmitFeedback: (feedback: FeedbackEntry) => void
}

type ActiveTab = "profile" | "security"

interface ProfileForm {
  fullName: string
  email: string
  countryCode: string
  phone: string
}

const cardClass =
  "rounded-3xl border border-[#1a2d4a] bg-[#0a1628]/80 shadow-[0_0_60px_rgba(37,99,235,0.1),0_32px_64px_rgba(0,0,0,0.4)] backdrop-blur-2xl"

const tabs = [
  { id: "profile", label: "Profile Information", icon: User },
  { id: "security", label: "Security", icon: Shield },
] as const

const links = [
  { label: "My Orders", icon: ShoppingBag, href: "/pedidos" },
  { label: "My Services", icon: Wrench, href: "/meus-servicos" },
  { label: "My Warranties", icon: BadgeCheck, href: "/minhas-garantias" },
]

const countryCodes = [
  { country: "United States", code: "+1" },
  { country: "Canada", code: "+1" },
  { country: "United Kingdom", code: "+44" },
  { country: "Brazil", code: "+55" },
  { country: "Portugal", code: "+351" },
  { country: "Spain", code: "+34" },
  { country: "France", code: "+33" },
  { country: "Germany", code: "+49" },
  { country: "Italy", code: "+39" },
  { country: "Netherlands", code: "+31" },
  { country: "Ireland", code: "+353" },
  { country: "Mexico", code: "+52" },
  { country: "Argentina", code: "+54" },
  { country: "Chile", code: "+56" },
  { country: "Colombia", code: "+57" },
  { country: "Peru", code: "+51" },
  { country: "Uruguay", code: "+598" },
  { country: "Paraguay", code: "+595" },
  { country: "Japan", code: "+81" },
  { country: "South Korea", code: "+82" },
  { country: "China", code: "+86" },
  { country: "India", code: "+91" },
  { country: "Australia", code: "+61" },
  { country: "New Zealand", code: "+64" },
  { country: "South Africa", code: "+27" },
  { country: "Nigeria", code: "+234" },
  { country: "Kenya", code: "+254" },
  { country: "South Sudan", code: "+211" },
  { country: "United Arab Emirates", code: "+971" },
  { country: "Saudi Arabia", code: "+966" },
  { country: "Turkey", code: "+90" },
  { country: "Israel", code: "+972" },
]

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 15)
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim()
}

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 1000
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.round(value * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span>{count}</span>
}

function ReadOnlyRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[#1a2d4a]/60 py-4 last:border-0">
      <span className="font-mono text-sm text-[#475569]">{label}</span>
      <span className={value ? "text-right text-sm font-medium text-white" : "text-right text-sm italic text-[#475569]"}>
        {value || "Not provided"}
      </span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  children,
  delay,
  onBlur,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  children?: React.ReactNode
  delay: number
  onBlur?: () => void
}) {
  return (
    <motion.label
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="block"
    >
      <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">{label}</span>
      <span className="relative block">
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#475569] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] ${
            readOnly ? "cursor-not-allowed bg-[#060d14]/50 pr-11 text-[#475569]" : children ? "pr-14" : ""
          }`}
        />
        {readOnly && <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569]" />}
        {children}
      </span>
    </motion.label>
  )
}

export default function ProfilePage({ user, onSubmitFeedback }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile")
  const [isEditing, setIsEditing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [form, setForm] = useState<ProfileForm>({
    fullName: user?.name || "",
    email: user?.email || "",
    countryCode: "+1",
    phone: "",
  })
  const [savedForm, setSavedForm] = useState(form)

  const displayName = savedForm.fullName || user?.name || "Client"
  const initials = useMemo(() => getInitials(displayName), [displayName])

  useEffect(() => {
    if (!showToast) return
    const timeout = window.setTimeout(() => setShowToast(false), 3500)
    return () => window.clearTimeout(timeout)
  }, [showToast])

  if (!user) return <Navigate to="/login" replace />

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const saveProfile = () => {
    setSavedForm(form)
    setIsEditing(false)
    setShowToast(true)
  }

  const cancelEdit = () => {
    setForm(savedForm)
    setIsEditing(false)
  }

  const submitFeedback = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const project = String(data.get("project") || "")
    const quote = String(data.get("quote") || "")
    const result = String(data.get("result") || "")

    onSubmitFeedback({
      id: `feedback-${Date.now()}`,
      quote,
      project,
      result,
      mediaUrl: "",
      mediaType: "image",
      name: displayName,
      role: "Client",
      company: user.company || "CAFÉ SERVICES Client",
      flag: "🌎",
      initials: getInitials(displayName),
      rating: 5,
      approved: false,
      createdAt: new Date().toISOString(),
    })
    event.currentTarget.reset()
    setShowToast(true)
  }

  const statItems = [
    { value: 0, label: "Orders" },
    { value: 0, label: "Services" },
    { value: 0, label: "Warranties" },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020408] px-6 pb-8 pt-28 text-white">
      <AuthBackground />
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl gap-6 py-8 lg:grid-cols-[0.3fr_0.7fr]"
      >
        <aside className={`${cardClass} p-6`}>
          <div className="pb-2 pt-4 text-center">
            <div className="relative mx-auto h-28 w-28">
              <motion.div
                className="absolute inset-0 -z-10 scale-125 rounded-full bg-[#2563eb]/20 blur-xl"
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1.2, 1.4, 1.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] text-3xl font-bold text-white ring-4 ring-[#2563eb]/30 ring-offset-4 ring-offset-[#0a1628]">
                {initials}
                <div className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-full bg-black/70 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  <Camera size={20} className="text-white" />
                  <span className="text-xs font-medium text-white">Change photo</span>
                </div>
              </div>
              <motion.span
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#0a1628] bg-[#22c55e]"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              />
            </div>

            <h1 className="mt-4 text-center text-xl font-bold text-white">{displayName}</h1>
            <p className="mt-1 text-center text-sm text-[#94a3b8]">{user.email}</p>
            <div className="mt-4 inline-flex rounded-full border border-[#2563eb]/20 bg-[#2563eb]/10 px-3 py-1 font-mono text-xs text-[#60a5fa]">
              Client Account
            </div>
          </div>

          <div className="my-6 border-t border-[#1a2d4a]" />

          <div className="flex">
            {statItems.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-2xl font-bold text-white"><CountUp value={item.value} /></span>
                <span className="font-mono text-xs uppercase tracking-wider text-[#475569]">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="my-6 border-t border-[#1a2d4a]" />

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    active
                      ? "flex w-full items-center gap-3 rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/15 px-4 py-3 font-medium text-white shadow-[0_0_16px_rgba(37,99,235,0.15)]"
                      : "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[#94a3b8] transition-all duration-200 hover:bg-white/5 hover:text-white"
                  }
                >
                  <Icon className={active ? "text-[#3b82f6]" : "text-[#475569]"} size={18} />
                  {tab.label}
                  {active && <motion.div layoutId="activeTab" className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />}
                </motion.button>
              )
            })}

            {links.map((item) => {
              const Icon = item.icon
              return (
                <motion.div key={item.href} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
                  <Link to={item.href} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[#94a3b8] transition-all duration-200 hover:bg-white/5 hover:text-white">
                    <Icon className="text-[#475569]" size={18} />
                    {item.label}
                    <ChevronRight className="ml-auto text-[#475569]" size={16} />
                  </Link>
                </motion.div>
              )
            })}
          </nav>
        </aside>

        <section className={`${cardClass} p-6 md:p-8`}>
          <AnimatePresence mode="wait">
            {activeTab === "profile" ? (
              <motion.div key="profile" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="mb-6 flex flex-col gap-4 border-b border-[#1a2d4a] pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Profile Information</h2>
                    <p className="mt-1 text-sm text-[#94a3b8]">Manage your personal details</p>
                  </div>

                  {!isEditing ? (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setIsEditing(true)} className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/15 px-5 py-2.5 text-sm font-semibold text-white">
                      Edit Profile
                    </motion.button>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={cancelEdit} className="rounded-xl border border-[#1a2d4a] px-4 py-2.5 text-sm text-[#94a3b8] transition-all duration-200 hover:border-[#2a4a7a] hover:text-white">
                        Cancel
                      </button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={saveProfile} className="flex items-center gap-2 rounded-xl border border-[#3b82f6]/30 bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300 hover:bg-[#1d4ed8] hover:shadow-[0_0_32px_rgba(37,99,235,0.55)]">
                        <Save size={16} />
                        Save
                      </motion.button>
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!isEditing ? (
                    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <ReadOnlyRow label="Full name" value={savedForm.fullName} />
                      <ReadOnlyRow label="Email" value={savedForm.email} />
                      <ReadOnlyRow label="Phone" value={savedForm.phone ? `${savedForm.countryCode} ${savedForm.phone}` : ""} />
                    </motion.div>
                  ) : (
                    <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Field label="Full name" value={form.fullName} onChange={(value) => updateField("fullName", value)} delay={0} />
                        </div>
                        <div className="md:col-span-2">
                          <Field label="Email" value={form.email} readOnly delay={0.06} />
                        </div>
                        <div className="md:col-span-2">
                          <motion.label
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.12 }}
                            className="block"
                          >
                            <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#475569]">Phone</span>
                            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                              <select
                                value={form.countryCode}
                                onChange={(event) => updateField("countryCode", event.target.value)}
                                className="w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-3 text-sm text-white outline-none transition-all duration-200 focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                              >
                                {countryCodes.map((item) => (
                                  <option key={`${item.country}-${item.code}`} value={item.code}>
                                    {item.code} - {item.country}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={form.phone}
                                onChange={(event) => updateField("phone", maskPhone(event.target.value))}
                                placeholder="Phone number"
                                className="w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#475569] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                              />
                            </div>
                          </motion.label>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-3 border-t border-[#1a2d4a] pt-6">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={saveProfile} className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-[#3b82f6]/30 bg-[#2563eb] px-6 py-2.5 font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300 hover:bg-[#1d4ed8] hover:shadow-[0_0_32px_rgba(37,99,235,0.55)]">
                          <Save size={16} />
                          Save Changes
                        </motion.button>
                        <button onClick={cancelEdit} className="rounded-xl border border-[#1a2d4a] px-6 py-2.5 text-[#94a3b8] transition-all duration-200 hover:border-[#2a4a7a] hover:text-white">
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="security" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="mb-6 border-b border-[#1a2d4a] pb-6">
                  <h2 className="text-xl font-bold text-white">Security</h2>
                  <p className="mt-1 text-sm text-[#94a3b8]">Review access and account protection settings</p>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: KeyRound, title: "Password", text: "Password management will be connected when backend auth is available.", action: "Update password" },
                    { icon: Smartphone, title: "Two-factor authentication", text: "Add an extra verification layer for sensitive account actions.", action: "Configure 2FA" },
                    { icon: Shield, title: "Session security", text: "Active sessions and device history will appear here.", action: "View sessions" },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.title} className="rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2563eb]/20 bg-[#2563eb]/10 text-[#60a5fa]">
                              <Icon size={20} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{item.title}</h3>
                              <p className="mt-1 text-sm leading-relaxed text-[#94a3b8]">{item.text}</p>
                            </div>
                          </div>
                          <button className="rounded-xl border border-[#1a2d4a] px-4 py-2.5 text-sm font-semibold text-[#94a3b8] transition-colors hover:border-[#2a4a7a] hover:text-white">
                            {item.action}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <form onSubmit={submitFeedback} className="mt-6 rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-6">
                  <h3 className="font-semibold text-white">Project feedback draft</h3>
                  <p className="mt-1 text-sm text-[#94a3b8]">This keeps the existing feedback submission flow available.</p>
                  <div className="mt-4 grid gap-3">
                    <input name="project" required placeholder="Project name" className="rounded-xl border border-[#1a2d4a] bg-[#0a1628] px-4 py-3 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]" />
                    <input name="result" placeholder="Result achieved" className="rounded-xl border border-[#1a2d4a] bg-[#0a1628] px-4 py-3 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]" />
                    <textarea name="quote" required rows={4} placeholder="Write feedback..." className="resize-none rounded-xl border border-[#1a2d4a] bg-[#0a1628] px-4 py-3 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]" />
                    <button className="w-fit rounded-xl border border-[#3b82f6]/30 bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]">
                      Submit feedback
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </motion.div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 flex min-w-[280px] items-center gap-3 rounded-2xl border border-[#22c55e]/30 bg-[#0a1628] px-5 py-4 shadow-[0_0_24px_rgba(34,197,94,0.15)]"
          >
            <CheckCircle2 size={22} className="text-[#22c55e]" />
            <div>
              <p className="font-semibold text-white">Profile updated</p>
              <p className="text-sm text-[#94a3b8]">Your changes were saved.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
