"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, User, Mail, Building, Globe, Calendar, DollarSign, CreditCard, FileText } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { createServiceOrder } from "../lib/serviceOrdersService"
import PhoneInput, { type PhoneFields } from "../components/ui/PhoneInput"
import TechPremiumBackground from "../components/ui/TechPremiumBackground"
import { ensureProfileFromAuthUser } from "../lib/supabaseProfile"
import toast from "react-hot-toast"

const SLUG_MAP: Record<string, { name: string; price: number; description: string; timeline: string }> = {
  "landing-page": {
    name: "Landing Page",
    price: 240,
    description: "High-conversion pages for campaigns, launches, and lead capture.",
    timeline: "5-7 business days",
  },
  "professional-website": {
    name: "Professional Website",
    price: 560,
    description: "Complete digital presence for brands that need credibility and clarity.",
    timeline: "10-15 business days",
  },
  "website": {
    name: "Professional Website",
    price: 560,
    description: "Complete digital presence for brands that need credibility and clarity.",
    timeline: "10-15 business days",
  },
  "saas-dashboard": {
    name: "Web App & SaaS",
    price: 0,
    description: "From MVP to a product that scales with real users and operations.",
    timeline: "Scoped after discovery",
  },
}

interface FormData {
  fullName: string
  email: string
  whatsapp: string
  company: string
  projectType: string
  projectGoal: string
  description: string
  references: string
  currentUrl: string
  deadline: string
  budget: string
  budgetNotes: string
  additionalNotes: string
}

const initialForm: FormData = {
  fullName: "",
  email: "",
  whatsapp: "",
  company: "",
  projectType: "",
  projectGoal: "",
  description: "",
  references: "",
  currentUrl: "",
  deadline: "",
  budget: "",
  budgetNotes: "",
  additionalNotes: "",
}

export default function HirePage() {
  const { serviceSlug } = useParams<{ serviceSlug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const serviceInfo = serviceSlug ? SLUG_MAP[serviceSlug] : undefined
  const isSaaS = serviceSlug === "saas-dashboard"

  const [form, setForm] = useState<FormData>(initialForm)
  const [phoneFields, setPhoneFields] = useState<PhoneFields | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!serviceInfo) {
      navigate("/", { replace: true })
    }
  }, [serviceInfo, navigate])

  useEffect(() => {
    if (!user || profileLoaded) return

    const loadProfile = async () => {
      try {
        const profile = await ensureProfileFromAuthUser(user)
        setForm((prev) => ({
          ...prev,
          fullName: profile.name || prev.fullName,
          email: profile.email || prev.email,
          whatsapp: profile.phone || prev.whatsapp,
          company: profile.company || prev.company,
        }))
      } catch {
        const meta = user.user_metadata || {}
        setForm((prev) => ({
          ...prev,
          fullName: (meta.full_name as string) || prev.fullName,
          email: user.email || prev.email,
        }))
      }
      setProfileLoaded(true)
    }

    loadProfile()
  }, [user, profileLoaded])

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!serviceInfo) return
    setError("")

    if (!form.fullName.trim()) { setError("Full name is required"); return }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { setError("Valid email is required"); return }
    if (!form.whatsapp.trim()) { setError("WhatsApp number is required"); return }
    if (!form.projectGoal.trim()) { setError("Project goal is required"); return }

    setSubmitting(true)

    try {
      const result = await createServiceOrder({
        userId: user?.id || undefined,
        clientName: form.fullName.trim(),
        clientEmail: form.email.trim(),
        clientPhone: phoneFields?.phone_e164 || form.whatsapp.trim(),
        phoneFields: phoneFields || undefined,
        company: form.company.trim() || undefined,
        serviceSlug: serviceSlug!,
        serviceName: serviceInfo.name,
        totalPrice: serviceInfo.price,
        projectType: form.projectType || undefined,
        projectGoal: form.projectGoal.trim(),
        projectDescription: form.description.trim() || form.projectGoal.trim(),
        referencesText: form.references.trim() || undefined,
        currentProjectUrl: form.currentUrl.trim() || undefined,
        desiredDeadline: form.deadline.trim() || undefined,
        budget: form.budget.trim() || undefined,
        budgetNotes: form.budgetNotes.trim() || undefined,
        additionalNotes: form.additionalNotes.trim() || undefined,
      })

      if (result) {
        toast.success("Order saved. Continue to checkout.")
        navigate(`/checkout/${result.id}`)
      }
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!serviceInfo) return null

  if (isSaaS) {
    const waMessage = "Hello! I'd like to discuss a Web App or SaaS project. Can we schedule a call to talk about the scope?"
    return (
      <div className="relative min-h-screen text-[#f0f0f5]">
        <TechPremiumBackground />
        <div className="relative z-10 container mx-auto px-4 py-20 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
          >
            <h1 className="text-2xl font-bold mb-2">Let's Discuss Your SaaS</h1>
            <p className="text-zinc-400 mb-6">
              Each SaaS project is unique. Reach out on WhatsApp so we can talk about your idea, scope, and timeline.
            </p>
            <a
              href={`https://wa.me/5541996713782?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              Chat on WhatsApp
            </a>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen text-[#f0f0f5]">
      <TechPremiumBackground />
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
        <Link
          to="/#work"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Plans
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-3">
            {serviceInfo.name}
          </div>
          <h1 className="text-3xl font-bold mb-2">Start Your Project</h1>
          <p className="text-zinc-400 text-sm">{serviceInfo.description}</p>
          <div className="flex gap-4 mt-4 text-sm">
            <span className="text-zinc-500">From <span className="text-white font-semibold">${serviceInfo.price}</span></span>
            <span className="text-zinc-500">Timeline: <span className="text-white">{serviceInfo.timeline}</span></span>
          </div>
          <div className="mt-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-xs text-yellow-400">
            50% upfront (${serviceInfo.price / 2}) is required to start. Your project starts after payment confirmation.
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <PhoneInput
                value={form.whatsapp}
                onChange={(e164) => update("whatsapp", e164)}
                onPhoneChange={setPhoneFields}
                required
                label="WhatsApp"
                placeholder="Phone number"
                id="whatsapp"
                name="whatsapp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Company <span className="text-zinc-600">(optional)</span>
              </label>
              <div className="relative">
                <Building size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Your brand or startup"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
          </div>



          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Project Goal <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.projectGoal}
              onChange={(e) => update("projectGoal", e.target.value)}
              placeholder="What is the main purpose of your project? (e.g., launch a product, build a portfolio, create a sales page)"
              rows={2}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Description <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Tell me more about what you need — sections, features, preferred style, content you already have..."
              rows={3}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              References <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={form.references}
              onChange={(e) => update("references", e.target.value)}
              placeholder="Share links to websites or designs you like — helps me understand your taste"
              rows={2}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Current Site URL <span className="text-zinc-600">(optional)</span>
              </label>
              <div className="relative">
                <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.currentUrl}
                  onChange={(e) => update("currentUrl", e.target.value)}
                  placeholder="https://"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Deadline <span className="text-zinc-600">(optional)</span>
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                  placeholder="e.g., 2 weeks, Jun 30"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Budget <span className="text-zinc-600">(optional)</span>
              </label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  placeholder="Any range in mind?"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Budget Notes <span className="text-zinc-600">(optional)</span>
              </label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.budgetNotes}
                  onChange={(e) => update("budgetNotes", e.target.value)}
                  placeholder="Any budget constraints or flexibility?"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Additional Notes <span className="text-zinc-600">(optional)</span>
              </label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={form.additionalNotes}
                  onChange={(e) => update("additionalNotes", e.target.value)}
                  placeholder="Anything else I should know?"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="touch-target w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#6d28d9] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(37,99,235,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {submitting ? "Creating checkout..." : "Continue to secure checkout"}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
